import multer from 'multer';

// ✅ **Define Allowed File Types**
const allowedFileTypes = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/mpeg': 'mpeg',
  'application/pdf': 'pdf',
};

// ✅ **Configure Multer Storage (Memory)**
const storage = multer.memoryStorage(); // Store files in memory buffer

// ✅ **Configure File Filter for Validation**
const fileFilter = (req, file, callback) => {
  if (allowedFileTypes[file.mimetype]) {
    callback(null, true);
  } else {
    callback(
      new Error('Invalid file type. Allowed: PNG, JPG, WEBP, GIF, MP4, PDF'),
    );
  }
};

// ✅ **Configure Multer Upload Settings**
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024, // Max file size: 10MB
  },
});

// ✅ **Exports**
export default upload;
