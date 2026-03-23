import express from 'express';
import authOptional from '../middleware/authOptional.js';
import {
  aiSummary,
  aiRewrite,
  aiSkills,
} from '../controllers/aiCvController.js';

const r = express.Router();

r.post('/cv/summary', authOptional, aiSummary);
r.post('/cv/rewrite-bullet', authOptional, aiRewrite);
r.post('/cv/suggest-skills', authOptional, aiSkills);

export default r;
