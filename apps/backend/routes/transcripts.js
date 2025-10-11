// apps/backend/routes/transcripts.js
import { Router } from 'express';
import { generateTranscript, getTranscript, downloadTranscript } from '../controllers/transcriptsController.js';
import anyAuth from '../middleware/anyAuth.js';

const r = Router();
r.post('/generate', anyAuth, generateTranscript);
r.get('/:id', anyAuth, getTranscript);
r.get('/:id/download', anyAuth, downloadTranscript);
export default r;
