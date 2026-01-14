import express from 'express';
import requireAuth from '../middleware/auth.js';
import {
  listTemplates,
  listDrafts,
  getDraft,
  createDraftHandler,
  updateDraft,
} from '../controllers/cvController.js';

const r = express.Router();

r.get('/templates', listTemplates);
r.get('/drafts', requireAuth, listDrafts);
r.post('/drafts', requireAuth, createDraftHandler);
r.get('/drafts/:id', requireAuth, getDraft);
r.patch('/drafts/:id', requireAuth, updateDraft);

export default r;
