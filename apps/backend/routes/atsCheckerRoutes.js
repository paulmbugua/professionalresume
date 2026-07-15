import express from 'express';
import multer from 'multer';
import authOptional from '../middleware/authOptional.js';
import { checkAtsResume } from '../controllers/atsCheckerController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    if (allowed.has(String(file.mimetype || '').toLowerCase()))
      return cb(null, true);
    return cb(new Error('Only PDF and DOCX files are supported'));
  },
});

const r = express.Router();
const uploadResume = upload.single('file');

function handleAtsUpload(req, res, next) {
  uploadResume(req, res, (err) => {
    if (!err) return next();
    return res.status(400).json({
      ok: false,
      code: 'ATS_UPLOAD_ERROR',
      error: err?.message || 'Upload a PDF or DOCX resume.',
    });
  });
}

r.post('/check', authOptional, handleAtsUpload, checkAtsResume);

export default r;
