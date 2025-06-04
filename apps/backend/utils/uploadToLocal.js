// utils/uploadToLocal.js

import fs from 'fs';
import path from 'path';

const uploadToLocal = async (files) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const uploadPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        if (!file || !file.buffer) {
          return reject(new Error('Missing file buffer'));
        }

        const uniqueFileName = `${Date.now()}-${file.originalname}`;
        const filePath = path.join(uploadsDir, uniqueFileName);

        fs.writeFile(filePath, file.buffer, (err) => {
          if (err) return reject(err);

          // Return only the relative path (no baseUrl or protocol)
          resolve({
            url: `/uploads/${encodeURIComponent(uniqueFileName)}`,
            fileName: uniqueFileName,
          });
        });
      });
    });

    return Promise.all(uploadPromises);
  } catch (error) {
    throw new Error('File upload failed: ' + error.message);
  }
};

export default uploadToLocal;
