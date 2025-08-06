const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const s3 = new S3Client({});

exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Parse S3 event
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing image: ${bucket}/${key}`);
    
    // Get the uploaded image and its metadata from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const { Body, Metadata } = await s3.send(getObjectCommand);
    const imageBuffer = Buffer.from(await Body.transformToByteArray());
    
    // Extract resize parameters from metadata (with defaults)
    const width = parseInt(Metadata?.resize_width || '800');
    const height = parseInt(Metadata?.resize_height || '600');
    const resizeMode = Metadata?.resize_mode || 'fit';
    const quality = parseInt(Metadata?.quality || '90');
    
    console.log(`Resize parameters: ${width}x${height}, mode: ${resizeMode}, quality: ${quality}`);
    
    // Process the image with Sharp based on resize mode
    let sharpInstance = sharp(imageBuffer);
    
    switch (resizeMode) {
      case 'fit':
        // Resize to fit within dimensions, maintaining aspect ratio
        sharpInstance = sharpInstance.resize(width, height, { 
          fit: 'inside',
          withoutEnlargement: true 
        });
        break;
        
      case 'fill':
        // Resize to fill dimensions, may crop to maintain aspect ratio
        sharpInstance = sharpInstance.resize(width, height, { 
          fit: 'cover' 
        });
        break;
        
      case 'stretch':
        // Stretch to exact dimensions (may distort)
        sharpInstance = sharpInstance.resize(width, height, { 
          fit: 'fill' 
        });
        break;
        
      case 'crop':
        // Intelligent crop to dimensions
        sharpInstance = sharpInstance.resize(width, height, { 
          fit: 'cover',
          position: 'center'
        });
        break;
        
      default:
        throw new Error(`Unknown resize mode: ${resizeMode}`);
    }
    
    // Apply quality and convert to JPEG
    const resizedBuffer = await sharpInstance
      .jpeg({ quality })
      .toBuffer();
    
    // Generate output key with dimensions in the name
    const outputKey = `resized/${width}x${height}_${resizeMode}_${key}`;
    
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
        'mode': resizeMode,
        'quality': quality.toString(),
        'processed-at': new Date().toISOString()
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
        dimensions: `${width}x${height}`,
        mode: resizeMode
      })
    };
    
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};
