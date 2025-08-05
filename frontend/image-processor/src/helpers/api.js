// helpers/api.js  (create this small helper file)
export async function getUploadUrl(file) {
  const apiURL = process.env.REACT_APP_API_URL + "/get-upload-url";

  const res = await fetch(apiURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
    }),
  });

  if (!res.ok) throw new Error("Failed to obtain upload URL");
  return res.json();                // { uploadURL, key }
}
