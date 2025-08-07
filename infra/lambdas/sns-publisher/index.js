const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const s3 = new S3Client({});
const sns = new SNSClient({});

exports.handler = async (event) => {
  console.log('SNS Publisher received S3 event:', JSON.stringify(event, null, 2));
  
  try {
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    // Get object metadata to determine processing type
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const { Metadata } = await s3.send(getObjectCommand);
    console.log('Object metadata:', Metadata);
    
    // Determine processing type based on metadata
    let processingType = 'resize'; // default
    if (Metadata?.['watermark-text']) processingType = 'watermark';
    if (Metadata?.['compress-quality'] || Metadata?.['compress-format']) processingType = 'compress';
    
    // Publish message to SNS with processing type attribute
    const publishCommand = new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Message: JSON.stringify(event),
      MessageAttributes: {
        processing_type: {
          DataType: 'String',
          StringValue: processingType
        }
      }
    });
    
    await sns.send(publishCommand);
    console.log(`Published SNS message for ${processingType} processing of ${key}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'SNS message published successfully',
        processingType: processingType,
        key: key
      })
    };
    
  } catch (error) {
    console.error('Error publishing SNS message:', error);
    throw error;
  }
};
