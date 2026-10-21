# Private bucket for profile pictures (ADR-0015): no ACLs, no public access. Without
# S3_PUBLIC_BASE_URL the API returns pre-signed URLs, valid for an hour.

resource "aws_s3_bucket" "pictures" {
  bucket        = "${local.name}-pictures-${local.account}"
  force_destroy = true # demo data, removed by the Destroy workflow
}

resource "aws_s3_bucket_public_access_block" "pictures" {
  bucket = aws_s3_bucket.pictures.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "pictures" {
  bucket = aws_s3_bucket.pictures.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "pictures" {
  bucket = aws_s3_bucket.pictures.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
