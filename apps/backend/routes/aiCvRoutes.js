import express from 'express';
import requireAuth from '../middleware/auth.js';
import { aiSummary, aiRewrite, aiSkills } from '../controllers/aiCvController.js';

const r = express.Router();

r.post('/cv/summary', requireAuth, aiSummary);
r.post('/cv/rewrite-bullet', requireAuth, aiRewrite);
r.post('/cv/suggest-skills', requireAuth, aiSkills);

export default r;
