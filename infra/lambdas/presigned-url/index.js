const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({});

exports.handler = async (event) => {
  try {
    const { fileName, fileType } = JSON.parse(event.body);
    const key = `${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.ORIGINAL_IMAGES_BUCKET,
      Key: key,
      ContentType: fileType
    });

    const uploadURL = await getSignedUrl(s3, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ uploadURL, key })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
