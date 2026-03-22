import express from 'express';
import requireAuth from '../middleware/auth.js';
import {
  createCoverLetter,
  deleteCoverLetter,
  getCoverLetter,
  listCoverLetters,
  updateCoverLetter,
} from '../controllers/coverLetterController.js';

const r = express.Router();

r.get('/drafts', requireAuth, listCoverLetters);
r.post('/drafts', requireAuth, createCoverLetter);
r.get('/drafts/:id', requireAuth, getCoverLetter);
r.put('/drafts/:id', requireAuth, updateCoverLetter);
r.patch('/drafts/:id', requireAuth, updateCoverLetter);
r.delete('/drafts/:id', requireAuth, deleteCoverLetter);

export default r;
