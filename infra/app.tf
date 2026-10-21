# The API (Dockerfile) on ECS Fargate behind an ALB. One task: the rate limiter is in-process
# (ADR-0008), so more instances would each allow the full limit.

resource "aws_ecr_repository" "app" {
  name                 = "${local.name}-app"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # Destroy also removes the pushed images

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.name}-app"
  retention_in_days = var.log_retention_days
}

# --- Secrets (SSM SecureString, AWS-managed key) -------------------------------------------

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "ops_token" {
  length  = 40
  special = false
}

locals {
  secrets = {
    JWT_SECRET       = random_password.jwt_secret.result
    OPS_TOKEN        = random_password.ops_token.result
    FB_CLIENT_ID     = var.fb_client_id
    FB_CLIENT_SECRET = var.fb_client_secret
  }
}

resource "aws_ssm_parameter" "secret" {
  for_each = toset(["JWT_SECRET", "OPS_TOKEN", "FB_CLIENT_ID", "FB_CLIENT_SECRET"])

  name  = "/${local.name}/${each.key}"
  type  = "SecureString"
  value = local.secrets[each.key]
}

# --- IAM -------------------------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Used by ECS to pull the image, write logs and inject the secrets as environment variables.
resource "aws_iam_role" "execution" {
  name               = "${local.name}-app-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid       = "AppSecrets"
    actions   = ["ssm:GetParameters"]
    resources = [for parameter in aws_ssm_parameter.secret : parameter.arn]
  }

  statement {
    sid       = "DatabasePassword"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_db_instance.main.master_user_secret[0].secret_arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

# Used by the app itself: the picture bucket, through the SDK's default credential chain (no
# static keys, see S3_ACCESS_KEY_ID in src/main/config/env.ts).
resource "aws_iam_role" "task" {
  name               = "${local.name}-app-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

data "aws_iam_policy_document" "task" {
  statement {
    sid       = "Pictures"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.pictures.arn}/*"]
  }
}

resource "aws_iam_role_policy" "task" {
  name   = "pictures"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task.json
}

# --- ECS ---------------------------------------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = local.name
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.name}-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.app_cpu
  memory                   = var.app_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${aws_ecr_repository.app.repository_url}:${var.app_image_tag}"
    essential = true

    # Pending migrations first (the docker-compose `migrate` service pattern), then the API.
    command = ["sh", "-c", "npm run migration:run:prod && exec node dist/main"]

    portMappings = [{ containerPort = 8080, protocol = "tcp" }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "8080" },
      { name = "DB_HOST", value = aws_db_instance.main.address },
      { name = "DB_PORT", value = tostring(aws_db_instance.main.port) },
      { name = "DB_USER", value = aws_db_instance.main.username },
      { name = "DB_DATABASE", value = aws_db_instance.main.db_name },
      { name = "S3_BUCKET", value = aws_s3_bucket.pictures.bucket },
      { name = "S3_REGION", value = var.aws_region },
      # CloudFront, then the ALB: the client IP is two X-Forwarded-For hops back.
      { name = "TRUST_PROXY_HOPS", value = "2" },
      { name = "API_DOCS_ENABLED", value = tostring(var.api_docs_enabled) },
    ]

    secrets = concat(
      [for key, parameter in aws_ssm_parameter.secret : { name = key, valueFrom = parameter.arn }],
      [{ name = "DB_PASSWORD", valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::" }]
    )

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "app"
      }
    }
  }])
}

resource "aws_lb" "app" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  drop_invalid_header_fields = true
}

resource "aws_lb_target_group" "app" {
  name        = "${local.name}-app"
  port        = 8080
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  deregistration_delay = 10

  health_check {
    path                = "/api/health"
    matcher             = "200"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

resource "aws_ecs_service" "app" {
  name            = "${local.name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Migrations run before the server listens.
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = true # reaches ECR, SSM and Facebook without a NAT gateway
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.http, aws_iam_role_policy.execution_secrets]
}
