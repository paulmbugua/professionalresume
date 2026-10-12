import express from 'express';
import multer from 'multer';
import requireAuth from '../middleware/auth.js';
import authOptional from '../middleware/authOptional.js';
import { requireCoverLetterEntitlement } from '../middleware/coverLetterEntitlement.js';
import { requireCvExportEntitlement } from '../middleware/cvExportEntitlement.js';
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
  getPrintHtml,
  improveExperienceController,
  getCoverLetterPrintHtml,
  exportCoverLetter,
  getCoverLetterEntitlementController,
} from '../controllers/cvController.js';
import { parseCvUpload } from '../controllers/cvParseController.js';
import rateLimit from 'express-rate-limit';
import { ingestOriginalResume, buildAiResume, getResumeVersions, downloadOriginalResume } from '../controllers/resumeGenerationController.js';
import { MAX_RESUME_BYTES } from '../services/resumeIngestionService.js';

const upload = multer({ storage: multer.memoryStorage() });
const parseUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    if (allowed.has(String(file.mimetype || '').toLowerCase()))
      return cb(null, true);
    return cb(new Error('Only PDF and DOCX files are supported'));
  },
});

const r = express.Router();
const resumeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_RESUME_BYTES, files: 1 } });
const resumeAiLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, keyGenerator: (req) => String(req.user.id), standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Resume AI request limit reached. Please try again in an hour.' } });
r.post('/original-resumes', requireAuth, resumeAiLimit, (req, res, next) => {
  resumeUpload.single('file')(req, res, (error) => error ? res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Resume uploads must be 8 MB or smaller.' : 'Invalid resume upload.' }) : next());
}, ingestOriginalResume);
r.post('/generate', requireAuth, resumeAiLimit, buildAiResume);
r.get('/original-resumes/:id/file', requireAuth, downloadOriginalResume);
r.get('/drafts/:id/generated-versions', requireAuth, getResumeVersions);

r.get('/templates', listTemplates);
r.post('/templates/upload', requireAuth, upload.single('file'), uploadTemplate);

r.get('/drafts', requireAuth, listDrafts);
r.post('/drafts', requireAuth, createDraftHandler);
r.get('/drafts/:id', requireAuth, getDraft);
r.get(
  '/drafts/:id/print-html',
  requireAuth,
  requireCvExportEntitlement,
  getPrintHtml,
);
r.put('/drafts/:id', requireAuth, updateDraft);
r.patch('/drafts/:id', requireAuth, updateDraft);
r.delete('/drafts/:id', requireAuth, deleteDraft);
r.post('/improve-experience', authOptional, improveExperienceController);
r.post(
  '/export',
  requireAuth,
  requireCvExportEntitlement,
  upload.single('file'),
  exportCv,
);
r.get(
  '/cover-letter/entitlement',
  requireAuth,
  getCoverLetterEntitlementController,
);
r.post(
  '/cover-letter/print-html',
  requireAuth,
  requireCoverLetterEntitlement,
  getCoverLetterPrintHtml,
);
r.post(
  '/cover-letter/export',
  requireAuth,
  requireCoverLetterEntitlement,
  exportCoverLetter,
);
r.post('/parse', authOptional, parseUpload.single('file'), parseCvUpload);
r.get('/files/:key/sign', requireAuth, signFileDownload);
r.get('/files/sign', requireAuth, signFileDownload);

export default r;
