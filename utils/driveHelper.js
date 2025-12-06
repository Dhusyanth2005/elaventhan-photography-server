// utils/driveHelper.js ← FINAL 2025 WORKING VERSION
const axios = require('axios');

const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;

const extractFolderId = (link) => {
  const match = link.match(/folders\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

const getFilesFromFolder = async (folderId) => {
  if (!folderId) return [];

  try {
    const url = `https://www.googleapis.com/drive/v3/files`;
    const params = {
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
      key: API_KEY,
      pageSize: 1000
    };

    const response = await axios.get(url, { params });
    
    return response.data.files
      .filter(file => file.mimeType.startsWith('image/'))
      .map(file => ({
        id: file.id,
        name: file.name,
        // THIS IS THE ONLY FORMAT THAT WORKS 100% IN 2025
        thumbnail: `https://lh3.googleusercontent.com/d/${file.id}=w400-h400-c?authuser=0`,
        fullImage: `https://lh3.googleusercontent.com/d/${file.id}`,
      }));
  } catch (error) {
    console.error('Drive API Error:', error.response?.data || error.message);
    throw new Error('Failed to fetch images');
  }
};

module.exports = { extractFolderId, getFilesFromFolder };