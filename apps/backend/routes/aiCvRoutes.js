import express from 'express';
import authOptional from '../middleware/authOptional.js';
import {
  aiJobRequirement,
  aiSummary,
  aiRewrite,
  aiSkills,
} from '../controllers/aiCvController.js';

const r = express.Router();

r.post('/cv/summary', authOptional, aiSummary);
r.post('/cv/rewrite-bullet', authOptional, aiRewrite);
r.post('/cv/suggest-skills', authOptional, aiSkills);
r.post('/cv/job-requirement-assist', authOptional, aiJobRequirement);

export default r;
