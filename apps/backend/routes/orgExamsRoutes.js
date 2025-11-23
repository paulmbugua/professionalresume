// apps/backend/routes/orgExamsRoutes.js
import { Router } from 'express';
import {
  getOrgExamConfig,
  upsertOrgExamConfig,
  getOrgExamSheet,
  saveOrgExamSheet,
  getOrgExamStudentCard,
  sendOrgExamStudentCardEmail,
  getOrgExamAnalytics,
  getOrgExamStudentCardPdf,
} from '../controllers/orgExamsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// All routes require org-context auth
router.use(requireAuth);

// Config (terms / sessions / grading)
router.get('/:orgId/exams/config', getOrgExamConfig);
router.post('/:orgId/exams/config', upsertOrgExamConfig);

// Marks entry
router.get('/:orgId/exams/sheet', getOrgExamSheet);
router.post('/:orgId/exams/sheet', saveOrgExamSheet);

// Student report card
router.get('/:orgId/exams/student/:studentId/card', getOrgExamStudentCard);
router.post('/:orgId/exams/student/:studentId/notify', sendOrgExamStudentCardEmail);

// Analytics
router.get('/:orgId/exams/analytics', getOrgExamAnalytics);
router.get('/:orgId/exams/student/:studentId/card.pdf', getOrgExamStudentCardPdf);
export default router;

