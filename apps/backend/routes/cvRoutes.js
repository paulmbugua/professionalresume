import express from 'express';
import multer from 'multer';
import requireAuth from '../middleware/auth.js';
import {
  listTemplates,
  listDrafts,
  getDraft,
  createDraftHandler,
  updateDraft,
  deleteDraft,
  exportCv,
  uploadTemplate,
  signFileDownload,
} from '../controllers/cvController.js';

const upload = multer({ storage: multer.memoryStorage() });
const r = express.Router();

r.get('/templates', listTemplates);
r.post('/templates/upload', requireAuth, upload.single('file'), uploadTemplate);

r.get('/drafts', requireAuth, listDrafts);
r.post('/drafts', requireAuth, createDraftHandler);
r.get('/drafts/:id', requireAuth, getDraft);
r.put('/drafts/:id', requireAuth, updateDraft);
r.patch('/drafts/:id', requireAuth, updateDraft);
r.delete('/drafts/:id', requireAuth, deleteDraft);

r.post('/export', requireAuth, upload.single('file'), exportCv);
r.get('/files/:key/sign', requireAuth, signFileDownload);
r.get('/files/sign', requireAuth, signFileDownload);

export default r;
