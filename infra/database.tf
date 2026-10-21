# PostgreSQL 15, the version docker-compose and the test suite use. The master password is
# generated and stored by RDS in Secrets Manager; the task reads it from there, so it never
# appears in Terraform state or the task definition.
#
# TLS: RDS now defaults rds.force_ssl to 1, and the app's TypeORM config connects without TLS
# (as it does to the local container), which RDS rejects ("no pg_hba.conf entry ... no
# encryption"). The parameter group below turns it off. The connection stays inside the VPC:
# the instance is not publicly accessible and its security group only admits the API task.
# Enabling TLS would mean shipping the RDS CA bundle in the image and an `ssl` option in
# src/main/config/orm.ts.

resource "aws_db_parameter_group" "main" {
  name   = "${local.name}-postgres15"
  family = "postgres15"

  parameter {
    name         = "rds.force_ssl"
    value        = "0"
    apply_method = "immediate"
  }
}

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

  parameter_group_name   = aws_db_parameter_group.main.name
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
