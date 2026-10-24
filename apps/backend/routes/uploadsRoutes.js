import express from 'express';
import multer from 'multer';
import authOptional from '../middleware/authOptional.js';
import {
  confirmUpload,
  presignUpload,
  uploadPhoto,
} from '../controllers/uploadsController.js';
import { maxPhotoBytes } from '../services/r2UploadService.js';

const router = express.Router();
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxPhotoBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(String(file.mimetype || '').toLowerCase())) {
      return callback(null, true);
    }
    return callback(new Error('Only JPG, PNG, and WEBP photos are supported.'));
  },
});

router.post('/photo', authOptional, (req, res, next) => {
  photoUpload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Max ${maxPhotoBytes} bytes.` });
    }
    return res.status(400).json({ error: error.message || 'Invalid photo upload.' });
  });
}, uploadPhoto);
router.post('/presign', authOptional, express.json(), presignUpload);
router.post('/confirm', authOptional, express.json(), confirmUpload);

export default router;
