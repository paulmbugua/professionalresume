// apps/backend/routes/transcriptRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import {
  generateTranscript,
  verifyTranscript,
  ogPreviewTranscript,
  downloadTranscript,
} from '../controllers/transcriptsController.js';

const r = express.Router();
r.post('/generate', authUser, generateTranscript);
r.get('/verify/:id', verifyTranscript);      // public JSON verify
r.get('/:id/og', ogPreviewTranscript);       // public SAMPLE preview
r.get('/:id/download', authUser, downloadTranscript);
export default r;
