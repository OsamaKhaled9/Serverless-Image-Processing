# Lambda function for generating pre-signed URLs
resource "aws_lambda_function" "presigned_url" {
filename = "./lambdas/presigned-url/deployment.zip"
  function_name = "${var.project_name}-presigned-url-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

source_code_hash = filebase64sha256("./lambdas/presigned-url/deployment.zip")


  environment {
    variables = {
      ORIGINAL_IMAGES_BUCKET = aws_s3_bucket.original_images_bucket.id
    }
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for Lambda to access S3 , SQS
resource "aws_iam_role_policy" "lambda_s3_policy" {
  name = "${var.project_name}-lambda-s3-policy-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "${aws_s3_bucket.original_images_bucket.arn}/*",
          "${aws_s3_bucket.processed_images_bucket.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage", 
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.resize_queue.arn,
          aws_sqs_queue.watermark_queue.arn,
          aws_sqs_queue.compress_queue.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.image_processing.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream", 
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}





# Resize Lambda function
resource "aws_lambda_function" "resize_image" {
  filename      = "./lambdas/resize/deployment.zip"
  function_name = "${var.project_name}-resize-image-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 512

  source_code_hash = filebase64sha256("./lambdas/resize/deployment.zip")

  environment {
    variables = {
      ORIGINAL_IMAGES_BUCKET  = aws_s3_bucket.original_images_bucket.id
      PROCESSED_IMAGES_BUCKET = aws_s3_bucket.processed_images_bucket.id
    }
  }
}

# Remove the old aws_lambda_permission resources for S3
# Add these new event source mappings instead:

# Event source mapping for resize Lambda
resource "aws_lambda_event_source_mapping" "resize_trigger" {
  event_source_arn = aws_sqs_queue.resize_queue.arn
  function_name    = aws_lambda_function.resize_image.arn
  batch_size       = 1
  enabled          = true
}

# Event source mapping for watermark Lambda  
resource "aws_lambda_event_source_mapping" "watermark_trigger" {
  event_source_arn = aws_sqs_queue.watermark_queue.arn
  function_name    = aws_lambda_function.watermark_image.arn
  batch_size       = 1
  enabled          = true
}

# Event source mapping for compress Lambda
resource "aws_lambda_event_source_mapping" "compress_trigger" {
  event_source_arn = aws_sqs_queue.compress_queue.arn
  function_name    = aws_lambda_function.compress_image.arn
  batch_size       = 1
  enabled          = true
}

resource "aws_lambda_function" "sns_publisher" {
  filename      = "./lambdas/sns-publisher/deployment.zip"
  function_name = "${var.project_name}-sns-publisher-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 10
  memory_size   = 128

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.image_processing.arn
    }
  }
}


# Watermark Lambda function
resource "aws_lambda_function" "watermark_image" {
  filename      = "./lambdas/watermark/deployment.zip"
  function_name = "${var.project_name}-watermark-image-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 512

  source_code_hash = filebase64sha256("./lambdas/watermark/deployment.zip")

  environment {
    variables = {
      ORIGINAL_IMAGES_BUCKET  = aws_s3_bucket.original_images_bucket.id
      PROCESSED_IMAGES_BUCKET = aws_s3_bucket.processed_images_bucket.id
    }
  }
}

# Compress Lambda function
resource "aws_lambda_function" "compress_image" {
  filename      = "./lambdas/compress/deployment.zip"
  function_name = "${var.project_name}-compress-image-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 512

  source_code_hash = filebase64sha256("./lambdas/compress/deployment.zip")

  environment {
    variables = {
      ORIGINAL_IMAGES_BUCKET  = aws_s3_bucket.original_images_bucket.id
      PROCESSED_IMAGES_BUCKET = aws_s3_bucket.processed_images_bucket.id
    }
  }
}
