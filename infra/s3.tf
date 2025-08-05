# S3 bucket for hosting React frontend
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "${var.project_name}-frontend-${var.environment}-${random_string.bucket_suffix.result}"
}

# Configure bucket for static website hosting
resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"  # For React Router to handle client-side routing
  }
}

# Disable block public access (needed for static website hosting)
resource "aws_s3_bucket_public_access_block" "frontend_bucket_pab" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket policy to allow public read access
resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  depends_on = [aws_s3_bucket_public_access_block.frontend_bucket_pab]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      }
    ]
  })
}

# S3 bucket for original images (users upload here)
resource "aws_s3_bucket" "original_images_bucket" {
  bucket = "${var.project_name}-original-${var.environment}-${random_string.bucket_suffix.result}"
}

# S3 bucket for processed images (Lambda outputs here)
resource "aws_s3_bucket" "processed_images_bucket" {
  bucket = "${var.project_name}-processed-${var.environment}-${random_string.bucket_suffix.result}"
}

# Configure versioning for image buckets (optional but recommended)
resource "aws_s3_bucket_versioning" "original_images_versioning" {
  bucket = aws_s3_bucket.original_images_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "processed_images_versioning" {
  bucket = aws_s3_bucket.processed_images_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Configure lifecycle rules to manage costs
resource "aws_s3_bucket_lifecycle_configuration" "image_buckets_lifecycle" {
  for_each = {
    original  = aws_s3_bucket.original_images_bucket.id
    processed = aws_s3_bucket.processed_images_bucket.id
  }

  bucket = each.value

rule {
  id     = "delete_old_versions"
  status = "Enabled"
  filter {
    prefix = ""  # Apply to all objects
  }
  noncurrent_version_expiration {
    noncurrent_days = 30
  }
}

}

# CORS configuration for image buckets (needed for frontend uploads)
resource "aws_s3_bucket_cors_configuration" "original_images_cors" {
  bucket = aws_s3_bucket.original_images_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "POST", "PUT"]
    allowed_origins = ["*"]  # In production, restrict this to your domain
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_cors_configuration" "processed_images_cors" {
  bucket = aws_s3_bucket.processed_images_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]  # In production, restrict this to your domain
    max_age_seconds = 3000
  }
}
