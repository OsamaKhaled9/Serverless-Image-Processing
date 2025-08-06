export const getUploadUrl = async (file, metadata = {}) => {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/get-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      fileName: file.name, 
      fileType: file.type,
      metadata: metadata 
    })
  });
  
  if (!response.ok) throw new Error('Failed to get upload URL');
  return response.json();
};
