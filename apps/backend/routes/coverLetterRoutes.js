import express from 'express';
import requireAuth from '../middleware/auth.js';
import { requireCoverLetterEntitlement } from '../middleware/coverLetterEntitlement.js';
import {
  createCoverLetter,
  deleteCoverLetter,
  getCoverLetter,
  listCoverLetters,
  updateCoverLetter,
} from '../controllers/coverLetterController.js';
import {
  exportCoverLetter,
  getCoverLetterPrintHtml,
} from '../controllers/cvController.js';

const r = express.Router();

r.get('/drafts', requireAuth, listCoverLetters);
r.post('/drafts', requireAuth, createCoverLetter);
r.get('/drafts/:id', requireAuth, getCoverLetter);
r.put('/drafts/:id', requireAuth, updateCoverLetter);
r.patch('/drafts/:id', requireAuth, updateCoverLetter);
r.delete('/drafts/:id', requireAuth, deleteCoverLetter);
r.post('/print-html', requireAuth, requireCoverLetterEntitlement, getCoverLetterPrintHtml);
r.post('/export', requireAuth, requireCoverLetterEntitlement, exportCoverLetter);

export default r;
