// apps/backend/routes/transcripts.js
import { Router } from 'express';
import { generateTranscript, getTranscript, downloadTranscript } from '../controllers/transcriptsController.js';
import authUser from '../middleware/authUser.js';

const r = Router();
r.post('/generate', authUser, generateTranscript);
r.get('/:id', authUser, getTranscript);
r.get('/:id/download', authUser, downloadTranscript);
export default r;
