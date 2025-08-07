# AWS Serverless Image Processing Platform

A modern, serverless image processing application built with React frontend and AWS Lambda backend, designed for fast and scalable image transformations.

## Table of Contents

- [Solution Overview](#solution-overview)
- [Architecture Diagram](#architecture-diagram)  
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup and Deployment](#setup-and-deployment)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Configure AWS Credentials](#2-configure-aws-credentials)
  - [3. Deploy Infrastructure](#3-deploy-infrastructure)
  - [4. Deploy Frontend](#4-deploy-frontend)
- [Adding New Processing Function](#adding-new-processing-function)
  - [Step 1: Create Lambda Function](#step-1-create-lambda-function)
  - [Step 2: Add Terraform Resources](#step-2-add-terraform-resources)
  - [Step 3: Update React App](#step-3-update-react-app)
  - [Step 4: Deploy](#step-4-deploy)
- [Infrastructure Components](#infrastructure-components)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [Contributing](#contributing)

## Solution Overview

The Serverless Image Processing Platform provides a cost-effective, scalable solution for on-demand image transformations. Built entirely on AWS serverless technologies, it eliminates the need for server management while providing enterprise-grade performance and reliability.

This solution automatically processes uploaded images through a variety of operations including resizing, watermarking, and compression. It uses a modern React frontend hosted on Amazon S3, AWS Lambda for serverless processing, and Amazon SNS/SQS for event-driven message routing.

The architecture is designed for:
- **Zero server management** - Fully serverless architecture
- **Cost efficiency** - Pay only for actual usage
- **High availability** - Built on AWS managed services
- **Scalability** - Automatically handles traffic spikes
- **Security** - IAM-based access controls throughout
- **Fault tolerance** - Dead letter queues for error handling

## Architecture Diagram

```
React App → API Gateway → Pre-signed URL Lambda → S3 Original Bucket
    ↓
SNS Publisher Lambda
    ↓
SNS Topic
    ↓
┌───────────┬─────────────┬──────────────┐
↓           ↓             ↓              ↓
Resize      Watermark     Compress       Queue
Queue       Queue         Queue
↓           ↓             ↓
Resize      Watermark     Compress       Lambda
Lambda      Lambda        Lambda
↓           ↓             ↓
           S3 Processed Bucket
        (organized by processing type)
```

### Architecture Flow

1. **Client** accesses the React application hosted on S3 Static Website
2. **Frontend** uploads images directly to S3 Original Images bucket via pre-signed URLs
3. **User** selects processing operation (resize/watermark/compress) through the UI
4. **SNS Publisher Lambda** publishes messages to SNS topic with processing parameters
5. **SNS Topic** routes messages to appropriate SQS queues based on filter policies
6. **SQS Queues** trigger corresponding Lambda functions for each processing type
7. **Processing Lambdas** retrieve images from Original S3 bucket, process them using Sharp, and save to Processed S3 bucket
8. **Results** are organized in separate folders by processing type in the Processed bucket

## Features

- **Image Resizing**: Custom dimensions with fit/fill/stretch/crop modes
- **Watermarking**: Text watermarks with position and opacity control  
- **Compression**: Quality optimization for JPEG, PNG, WebP formats
- **Event-driven**: SNS/SQS architecture for scalable processing
- **User-friendly**: React interface with drag-and-drop upload
- **Fault tolerant**: Dead letter queues for error handling
- **Organized output**: Separate S3 folders by processing type

## Project Structure

```
serverless-image-processing/
├── infra/                           # Terraform infrastructure
│   ├── lambda.tf                    # Lambda function definitions
│   ├── s3.tf                        # S3 bucket configurations
│   ├── sns.tf                       # SNS topic and policies
│   ├── sqs.tf                       # SQS queues and subscriptions
│   ├── api-gateway.tf               # API Gateway setup
│   └── variables.tf                 # Terraform variables
├── lambdas/                         # Lambda function code
│   ├── presigned-url/               # Pre-signed URL generation
│   ├── sns-publisher/               # SNS message publisher
│   ├── resize/                      # Image resizing function
│   ├── watermark/                   # Watermark application
│   └── compress/                    # Image compression
├── frontend/image-processor/        # React application
│   ├── src/                         # React source code
│   ├── public/                      # Static assets
│   └── package.json                 # React dependencies
└── README.md                        # This file
```

## Prerequisites

- AWS CLI configured with appropriate permissions
- Terraform >= 1.0
- Node.js >= 18
- npm or yarn

## Setup and Deployment

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd serverless-image-processing
```

### 2. Configure AWS Credentials

Ensure your AWS CLI is configured with appropriate permissions:

```bash
aws configure
```

### 3. Deploy Infrastructure

```bash
cd infra
terraform init
terraform plan
terraform apply
```

### 4. Deploy Frontend

```bash
cd ../frontend/image-processor
npm install
npm run build
aws s3 sync build/ s3://your-frontend-bucket-name --delete
```

Create Lambda deployment packages for each function:

```bash
# For each Lambda function
cd ../../lambdas/[function-name]
npm install --platform=linux --arch=x64
powershell Compress-Archive -Path .* -DestinationPath .\deployment.zip -Force
```

Redeploy with Lambda functions:

```bash
cd ../../infra
terraform apply
```

## Adding New Processing Function

Follow these steps to add a new image processing capability:

### Step 1: Create Lambda Function

#### Create function directory:
```bash
mkdir lambdas/new-function
cd lambdas/new-function
```

#### Create package.json:
```json
{
  "name": "new-function-lambda",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "sharp": "^0.32.6"
  }
}
```

#### Create index.js with SQS event parsing:
```javascript
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

exports.handler = async (event) => {
  try {
    // Parse SQS → SNS → S3 event
    const sqsRecord = event.Records[0];
    const snsMessage = JSON.parse(sqsRecord.body);
    const s3Event = JSON.parse(snsMessage.Message);
    const record = s3Event.Records[0];

    // Extract S3 info
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    // Get image and metadata
    const { Body, Metadata } = await s3.send(new GetObjectCommand({
      Bucket: bucket, Key: key
    }));
    
    // Extract processing parameters from metadata
    const param1 = Metadata?.['new-function-param1'] || 'default';
    
    // Process image with Sharp
    const imageBuffer = Buffer.from(await Body.transformToByteArray());
    const processedBuffer = await sharp(imageBuffer)
      ./* your processing logic */
      .toBuffer();
    
    // Save to processed bucket
    await s3.send(new PutObjectCommand({
      Bucket: process.env.PROCESSED_IMAGES_BUCKET,
      Key: `new-function/${param1}_${key}`,
      Body: processedBuffer,
      ContentType: 'image/jpeg'
    }));
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

### Step 2: Add Terraform Resources

#### Add to `infra/lambda.tf`:
```hcl
resource "aws_lambda_function" "new_function" {
  filename         = "../lambdas/new-function/deployment.zip"
  function_name    = "${var.project_name}-new-function-${var.environment}"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 512

  environment {
    variables = {
      ORIGINAL_IMAGES_BUCKET  = aws_s3_bucket.original_images_bucket.id
      PROCESSED_IMAGES_BUCKET = aws_s3_bucket.processed_images_bucket.id
    }
  }
}

resource "aws_lambda_event_source_mapping" "new_function_trigger" {
  event_source_arn = aws_sqs_queue.new_function_queue.arn
  function_name    = aws_lambda_function.new_function.arn
  batch_size       = 1
}
```

#### Add to `infra/sqs.tf`:
```hcl
resource "aws_sqs_queue" "new_function_queue" {
  name = "${var.project_name}-new-function-queue-${var.environment}"

  # ... queue configuration
}

resource "aws_sns_topic_subscription" "new_function_subscription" {
  topic_arn = aws_sns_topic.image_processing.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.new_function_queue.arn

  filter_policy = jsonencode({
    processing_type = ["new-function"]
  })
}
```

### Step 3: Update React App

#### Add to processing options in `App.js`:
```javascript
const processingOptions = [
  // existing options...
  {
    value: 'new-function',
    name: 'New Function',
    icon: '🔧',
    desc: 'Description of new processing capability'
  }
];
```

#### Add metadata handling:
```javascript
// In uploadImageToS3 function
if (processingParams.newFunctionParam) {
  metadata['new-function-param1'] = processingParams.newFunctionParam;
}
```

### Step 4: Deploy

```bash
# Install dependencies
cd lambdas/new-function
npm install --platform=linux --arch=x64
powershell Compress-Archive -Path .* -DestinationPath .\deployment.zip -Force

# Deploy infrastructure
cd ../../infra
terraform apply

# Update React app
cd ../frontend/image-processor
npm run build
aws s3 sync build/ s3://your-frontend-bucket --delete
```

## Infrastructure Components

- **S3 Buckets**: Original images, processed images, frontend hosting
- **Lambda Functions**: Pre-signed URL generation, SNS publishing, image processing
- **SNS/SQS**: Event-driven message routing and processing
- **API Gateway**: REST API for frontend communication
- **IAM**: Secure role-based permissions

## Testing

### Test individual processing types:
```bash
# Monitor Lambda logs
aws logs tail /aws/lambda/image-processing-app-[function-name]-dev --follow

# Check S3 processed bucket
aws s3 ls s3://image-processing-app-processed-dev-[suffix] --recursive
```

## Monitoring

- CloudWatch Logs for Lambda function monitoring
- SQS queue metrics for processing throughput
- S3 metrics for storage utilization
- Dead letter queues for error tracking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the "Adding New Function" guide
4. Submit a pull request

