const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const s3 = new S3Client({});

exports.handler = async (event) => {
  console.log('Watermark event received:', JSON.stringify(event, null, 2));
  
  try {
    // Parse S3 event
    const sqsRecord = event.Records[0];
    const snsMessage = JSON.parse(sqsRecord.body);
    const s3Event = JSON.parse(snsMessage.Message);
    const record = s3Event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing watermark for image: ${bucket}/${key}`);
    
    // Get the uploaded image and its metadata from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const { Body, Metadata } = await s3.send(getObjectCommand);
    const imageBuffer = Buffer.from(await Body.transformToByteArray());
    
    // Extract watermark parameters from metadata (with defaults)
    // Extract watermark parameters from metadata (with decoding)
    const watermarkText = Metadata?.['watermark-text'] ? 
      decodeURIComponent(Metadata['watermark-text']) : '© Your Brand';
    const position = Metadata?.['watermark-position'] || 'bottom-right';
    const opacity = parseFloat(Metadata?.['watermark-opacity'] || '0.7');
    const fontSize = parseInt(Metadata?.['watermark-fontsize'] || '24');

    
    console.log(`Watermark parameters: text="${watermarkText}", position=${position}, opacity=${opacity}, fontSize=${fontSize}`);
    
    // Get image dimensions
    const { width, height } = await sharp(imageBuffer).metadata();
    
    // Calculate position coordinates
    const padding = 20;
    let textX, textY, textAnchor;
    
    switch (position) {
      case 'top-left':
        textX = padding;
        textY = fontSize + padding;
        textAnchor = 'start';
        break;
      case 'top-right':
        textX = width - padding;
        textY = fontSize + padding;
        textAnchor = 'end';
        break;
      case 'bottom-left':
        textX = padding;
        textY = height - padding;
        textAnchor = 'start';
        break;
      case 'bottom-right':
        textX = width - padding;
        textY = height - padding;
        textAnchor = 'end';
        break;
      case 'center':
        textX = width / 2;
        textY = height / 2;
        textAnchor = 'middle';
        break;
      default:
        textX = width - padding;
        textY = height - padding;
        textAnchor = 'end';
    }
    
    // Create watermark SVG
    const watermarkSvg = `
      <svg width="${width}" height="${height}">
        <text x="${textX}" y="${textY}"
              font-family="Arial, sans-serif" 
              font-size="${fontSize}" 
              fill="rgba(255,255,255,${opacity})"
              stroke="rgba(0,0,0,${opacity * 0.3})"
              stroke-width="1"
              text-anchor="${textAnchor}">
          ${watermarkText}
        </text>
      </svg>
    `;
    
    // Apply watermark to image
    const watermarkedBuffer = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(watermarkSvg), top: 0, left: 0 }])
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // Generate output key
    // Decode URL-encoded watermark text and generate clean filename
    const decodedText = decodeURIComponent(watermarkText.replace(/=/g, '%'));
    const cleanText = decodedText.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const outputKey = `watermarked/${cleanText}_${position}_${key}`;

    
    // Upload processed image to Processed bucket
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.PROCESSED_IMAGES_BUCKET,
      Key: outputKey,
      Body: watermarkedBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        'original-key': key,
        'processing-type': 'watermark',
        'watermark-text': watermarkText,
        'watermark-position': position,
        'watermark-opacity': opacity.toString(),
        'processed-at': new Date().toISOString()
      }
    });
    
    await s3.send(putObjectCommand);
    
    console.log(`Successfully watermarked image: ${outputKey}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image watermarked successfully',
        originalKey: key,
        processedKey: outputKey,
        watermarkText: watermarkText,
        position: position
      })
    };
    
  } catch (error) {
    console.error('Error processing watermark:', error);
    throw error;
  }
};
