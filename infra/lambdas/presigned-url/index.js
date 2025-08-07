const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({});
const sns = new SNSClient({});

exports.handler = async (event) => {
  try {
    const { fileName, fileType, metadata = {} } = JSON.parse(event.body);
    const key = `${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.ORIGINAL_IMAGES_BUCKET,
      Key: key,
      ContentType: fileType,
      Metadata: metadata
    });

    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 300 });

    // Determine processing type from metadata
    let processingType = 'resize'; // default
    if (metadata['watermark-text']) processingType = 'watermark';
    if (metadata['compress-quality']) processingType = 'compress';

    // Prepare SNS message for after upload completes
    const snsMessage = {
      bucket: process.env.ORIGINAL_IMAGES_BUCKET,
      key: key,
      metadata: metadata,
      processingType: processingType
    };

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ 
        uploadURL, 
        key,
        processingType: processingType
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
