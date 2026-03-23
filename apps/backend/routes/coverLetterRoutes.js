import express from 'express';
import multer from 'multer';
import requireAuth from '../middleware/auth.js';
import { requireCoverLetterEntitlement } from '../middleware/coverLetterEntitlement.js';
import {
  createCoverLetter,
  deleteCoverLetter,
  exportCoverLetter,
  getCoverLetter,
  getCoverLetterPrintHtml,
  listCoverLetters,
  updateCoverLetter,
} from '../controllers/coverLetterController.js';
import { importCoverLetterDocument } from '../controllers/coverLetterImportController.js';

const r = express.Router();
const parseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    if (allowed.has(String(file.mimetype || '').toLowerCase())) return cb(null, true);
    return cb(new Error('Only PDF and DOCX files are supported'));
  },
});

r.get('/drafts', requireAuth, listCoverLetters);
r.post('/drafts', requireAuth, createCoverLetter);
r.post('/import', requireAuth, parseUpload.single('file'), importCoverLetterDocument);
r.get('/drafts/:id', requireAuth, getCoverLetter);
r.put('/drafts/:id', requireAuth, updateCoverLetter);
r.patch('/drafts/:id', requireAuth, updateCoverLetter);
r.delete('/drafts/:id', requireAuth, deleteCoverLetter);
r.post('/print-html', requireAuth, requireCoverLetterEntitlement, getCoverLetterPrintHtml);
r.post('/export', requireAuth, requireCoverLetterEntitlement, exportCoverLetter);

export default r;
