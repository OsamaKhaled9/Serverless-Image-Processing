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

# IAM policy for Lambda to access S3
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

# Lambda permission for S3 to invoke resize function
resource "aws_lambda_permission" "s3_invoke_resize" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resize_image.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.original_images_bucket.arn
}

