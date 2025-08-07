const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const s3 = new S3Client({});

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Parse S3 event (when image is uploaded to Original bucket)
    const sqsRecord = event.Records[0];
    const snsMessage = JSON.parse(sqsRecord.body);
    const s3Event = JSON.parse(snsMessage.Message);
    const record = s3Event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing image: ${bucket}/${key}`);
    
    // Get the uploaded image from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const { Body } = await s3.send(getObjectCommand);
    const imageBuffer = Buffer.from(await Body.transformToByteArray());
    
    // Extract resize parameters from object metadata or use defaults
    // For now, we'll use fixed dimensions - later we'll get from metadata
    const width = 800;
    const height = 600;
    const resizeMode = 'fit'; // fit, fill, or stretch
    
    // Process the image with Sharp
    let resizedBuffer;
    
    switch (resizeMode) {
      case 'fit':
        resizedBuffer = await sharp(imageBuffer)
          .resize(width, height, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ quality: 90 })
          .toBuffer();
        break;
        
      case 'fill':
        resizedBuffer = await sharp(imageBuffer)
          .resize(width, height, { fit: 'cover' })
          .jpeg({ quality: 90 })
          .toBuffer();
        break;
        
      case 'stretch':
        resizedBuffer = await sharp(imageBuffer)
          .resize(width, height, { fit: 'fill' })
          .jpeg({ quality: 90 })
          .toBuffer();
        break;
        
      default:
        throw new Error(`Unknown resize mode: ${resizeMode}`);
    }
    
    // Generate output key for processed image
    const outputKey = `resized/${key}`;
    
    // Upload processed image to Processed bucket
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.PROCESSED_IMAGES_BUCKET,
      Key: outputKey,
      Body: resizedBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        'original-key': key,
        'processing-type': 'resize',
        'dimensions': `${width}x${height}`,
        'mode': resizeMode
      }
    });
    
    await s3.send(putObjectCommand);
    
    console.log(`Successfully resized image: ${outputKey}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image resized successfully',
        originalKey: key,
        processedKey: outputKey,
        dimensions: `${width}x${height}`
      })
    };
    
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};
