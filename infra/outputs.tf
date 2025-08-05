output "frontend_bucket_name" {
  description = "Name of the S3 bucket hosting the frontend"
  value       = aws_s3_bucket.frontend_bucket.id
}

output "frontend_website_url" {
  description = "Website URL for the React app"
  value       = "http://${aws_s3_bucket_website_configuration.frontend_website.website_endpoint}"
}

output "original_images_bucket_name" {
  description = "Name of the S3 bucket for original images"
  value       = aws_s3_bucket.original_images_bucket.id
}

output "processed_images_bucket_name" {
  description = "Name of the S3 bucket for processed images"
  value       = aws_s3_bucket.processed_images_bucket.id
}

output "frontend_bucket_arn" {
  description = "ARN of the frontend bucket"
  value       = aws_s3_bucket.frontend_bucket.arn
}
