# Dead Letter Queues for failed processing
resource "aws_sqs_queue" "resize_dlq" {
  name = "${var.project_name}-resize-dlq-${var.environment}"
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

resource "aws_sqs_queue" "watermark_dlq" {
  name = "${var.project_name}-watermark-dlq-${var.environment}"
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

resource "aws_sqs_queue" "compress_dlq" {
  name = "${var.project_name}-compress-dlq-${var.environment}"
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# SQS Queue for Resize Processing
resource "aws_sqs_queue" "resize_queue" {
  name                       = "${var.project_name}-resize-queue-${var.environment}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 1209600 # 14 days
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.resize_dlq.arn
    maxReceiveCount     = 3
  })
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# SQS Queue for Watermark Processing
resource "aws_sqs_queue" "watermark_queue" {
  name                       = "${var.project_name}-watermark-queue-${var.environment}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 1209600 # 14 days
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.watermark_dlq.arn
    maxReceiveCount     = 3
  })
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# SQS Queue for Compression Processing
resource "aws_sqs_queue" "compress_queue" {
  name                       = "${var.project_name}-compress-queue-${var.environment}"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 1209600 # 14 days
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.compress_dlq.arn
    maxReceiveCount     = 3
  })
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}

# SQS Queue Policies to allow SNS to send messages
resource "aws_sqs_queue_policy" "resize_queue_policy" {
  queue_url = aws_sqs_queue.resize_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = "sqs:SendMessage"
        Resource = aws_sqs_queue.resize_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.image_processing.arn
          }
        }
      }
    ]
  })
}

resource "aws_sqs_queue_policy" "watermark_queue_policy" {
  queue_url = aws_sqs_queue.watermark_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = "sqs:SendMessage"
        Resource = aws_sqs_queue.watermark_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.image_processing.arn
          }
        }
      }
    ]
  })
}

resource "aws_sqs_queue_policy" "compress_queue_policy" {
  queue_url = aws_sqs_queue.compress_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action = "sqs:SendMessage"
        Resource = aws_sqs_queue.compress_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.image_processing.arn
          }
        }
      }
    ]
  })
}

# SNS Topic Subscriptions with Message Filtering
resource "aws_sns_topic_subscription" "resize_subscription" {
  topic_arn = aws_sns_topic.image_processing.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.resize_queue.arn
  
  filter_policy = jsonencode({
    processing_type = ["resize"]
  })
}

resource "aws_sns_topic_subscription" "watermark_subscription" {
  topic_arn = aws_sns_topic.image_processing.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.watermark_queue.arn
  
  filter_policy = jsonencode({
    processing_type = ["watermark"]
  })
}

resource "aws_sns_topic_subscription" "compress_subscription" {
  topic_arn = aws_sns_topic.image_processing.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.compress_queue.arn
  
  filter_policy = jsonencode({
    processing_type = ["compress"]
  })
}
