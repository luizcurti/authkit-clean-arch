# PostgreSQL 15, the version docker-compose and the test suite use. 15 also keeps
# rds.force_ssl off by default (16+ turns it on), matching the app's TypeORM config, which has
# no TLS options. The master password is generated and stored by RDS in Secrets Manager; the
# task reads it from there, so it never appears in Terraform state or the task definition.

resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.public[*].id
}

resource "aws_db_instance" "main" {
  identifier     = local.name
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.db_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name                     = "authkit_db"
  username                    = "authkit"
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  # Demo stack, torn down by the Destroy workflow: no final snapshot, no deletion protection.
  backup_retention_period    = 1
  skip_final_snapshot        = true
  deletion_protection        = false
  apply_immediately          = true
  auto_minor_version_upgrade = true
}
