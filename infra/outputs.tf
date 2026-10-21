output "api_url" {
  description = "Base URL of the API over HTTPS (routes under /api, Swagger UI at /api-docs)."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecs_cluster" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service" {
  value = aws_ecs_service.app.name
}

output "task_definition" {
  value = aws_ecs_task_definition.app.family
}

output "task_subnets" {
  value = join(",", aws_subnet.public[*].id)
}

output "task_security_group" {
  value = aws_security_group.app.id
}

output "ssm_prefix" {
  description = "SSM SecureString parameters JWT_SECRET, OPS_TOKEN, FB_CLIENT_ID and FB_CLIENT_SECRET live under this path."
  value       = "/${local.name}"
}
