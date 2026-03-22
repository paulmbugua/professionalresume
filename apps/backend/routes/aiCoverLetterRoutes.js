import express from 'express';
import requireAuth from '../middleware/auth.js';
import {
  aiCoverLetterGenerate,
  aiCoverLetterRewrite,
  aiCoverLetterImproveParagraph,
  aiCoverLetterSubject,
  aiCoverLetterGreetingClosing,
} from '../controllers/aiCoverLetterController.js';

const r = express.Router();

r.post('/cover-letter/generate', requireAuth, aiCoverLetterGenerate);
r.post('/cover-letter/rewrite-style', requireAuth, aiCoverLetterRewrite);
r.post('/cover-letter/improve-paragraph', requireAuth, aiCoverLetterImproveParagraph);
r.post('/cover-letter/subject-lines', requireAuth, aiCoverLetterSubject);
r.post('/cover-letter/greeting-closing', requireAuth, aiCoverLetterGreetingClosing);

export default r;
