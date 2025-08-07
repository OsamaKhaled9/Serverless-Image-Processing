# SNS topic for image processing events
resource "aws_sns_topic" "image_processing" {
  name = "${var.project_name}-image-processing-${var.environment}"
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# SNS topic policy to allow S3 to publish
resource "aws_sns_topic_policy" "image_processing_policy" {
  arn = aws_sns_topic.image_processing.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "SNS:Publish"
        Resource = aws_sns_topic.image_processing.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
          ArnEquals = {
            "aws:SourceArn" = aws_s3_bucket.original_images_bucket.arn
          }
        }
      }
    ]
  })
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}
