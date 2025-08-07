const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const s3 = new S3Client({});

exports.handler = async (event) => {
  console.log('Compression event received:', JSON.stringify(event, null, 2));
  
  try {
    // Parse S3 event
    const sqsRecord = event.Records[0];
    const snsMessage = JSON.parse(sqsRecord.body);
    const s3Event = JSON.parse(snsMessage.Message);
    const record = s3Event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing compression for image: ${bucket}/${key}`);
    
    // Get the uploaded image and its metadata from S3
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const { Body, Metadata } = await s3.send(getObjectCommand);
    const imageBuffer = Buffer.from(await Body.transformToByteArray());
    
    // Extract compression parameters from metadata (with defaults)
    const quality = parseInt(Metadata?.['compress-quality'] || '75');
    const format = Metadata?.['compress-format'] || 'jpeg';
    const optimization = Metadata?.['compress-optimization'] || 'medium';
    
    console.log(`Compression parameters: quality=${quality}, format=${format}, optimization=${optimization}`);
    
    // Get original size for comparison
    const originalSize = imageBuffer.length;
    
    // Initialize Sharp processor
    let processor = sharp(imageBuffer);
    let outputContentType = 'image/jpeg';
    let fileExtension = 'jpg';
    
    // Apply format-specific compression
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        processor = processor.jpeg({ 
          quality: quality, 
          progressive: optimization === 'high',
          mozjpeg: true 
        });
        outputContentType = 'image/jpeg';
        fileExtension = 'jpg';
        break;
        
      case 'webp':
        const webpEffort = optimization === 'high' ? 6 : optimization === 'medium' ? 4 : 2;
        processor = processor.webp({ 
          quality: quality, 
          effort: webpEffort 
        });
        outputContentType = 'image/webp';
        fileExtension = 'webp';
        break;
        
      case 'png':
        const compressionLevel = optimization === 'high' ? 6 : optimization === 'medium' ? 8 : 9;
        processor = processor.png({ 
          quality: quality,
          compressionLevel: compressionLevel,
          adaptiveFiltering: optimization === 'high'
        });
        outputContentType = 'image/png';
        fileExtension = 'png';
        break;
        
      case 'avif':
        const avifEffort = optimization === 'high' ? 9 : optimization === 'medium' ? 6 : 3;
        processor = processor.avif({ 
          quality: quality,
          effort: avifEffort
        });
        outputContentType = 'image/avif';
        fileExtension = 'avif';
        break;
        
      default:
        // Default to JPEG
        processor = processor.jpeg({ quality: quality, progressive: true, mozjpeg: true });
        outputContentType = 'image/jpeg';
        fileExtension = 'jpg';
    }
    
    // Process the image
    const compressedBuffer = await processor.toBuffer();
    const compressedSize = compressedBuffer.length;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
    
    // Generate output key with compression info
    const keyWithoutExtension = key.replace(/\.[^/.]+$/, '');
    const outputKey = `compressed/${quality}q_${format}_${compressionRatio}percent_${keyWithoutExtension}.${fileExtension}`;
    
    // Upload processed image to Processed bucket
    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.PROCESSED_IMAGES_BUCKET,
      Key: outputKey,
      Body: compressedBuffer,
      ContentType: outputContentType,
      Metadata: {
        'original-key': key,
        'processing-type': 'compression',
        'compress-quality': quality.toString(),
        'compress-format': format,
        'compress-optimization': optimization,
        'original-size': originalSize.toString(),
        'compressed-size': compressedSize.toString(),
        'compression-ratio': compressionRatio,
        'processed-at': new Date().toISOString()
      }
    });
    
    await s3.send(putObjectCommand);
    
    console.log(`Successfully compressed image: ${outputKey} (${compressionRatio}% reduction)`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image compressed successfully',
        originalKey: key,
        processedKey: outputKey,
        stats: {
          originalSize: originalSize,
          compressedSize: compressedSize,
          compressionRatio: `${compressionRatio}%`,
          format: format,
          quality: quality
        }
      })
    };
    
  } catch (error) {
    console.error('Error processing compression:', error);
    throw error;
  }
};
