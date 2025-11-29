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
  generateOrgExamStudentAiRemarks,
  saveOrgExamStudentRemarks,
  // ⬇️ NEW: class report controller
  getOrgClassReportPdf,
  generateOrgExamSheetAiCompute, 
  generateOrgExamSheetFromDocs,
  generateOrgExamConfigAi,
} from '../controllers/orgExamsController.js';

// ⬇️ Auth + tier guard
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

// AI + remarks
router.post(
  '/:orgId/exams/student/:studentId/ai-remarks',
  generateOrgExamStudentAiRemarks,
);

router.post(
  '/:orgId/exams/student/:studentId/remarks',
  saveOrgExamStudentRemarks,
);

router.post(
  '/:orgId/exams/config/ai',
                 // whatever org auth middleware you use
  generateOrgExamConfigAi,
);


router.get(
  '/:orgId/exams/sessions/:sessionId/class-report.pdf',
      // ✅ pass middleware, don't call it
  getOrgClassReportPdf,
);

// 🔹 NEW: AI compute/fill for the marks sheet
router.post(
  '/:orgId/exams/sheet/ai-compute',
  generateOrgExamSheetAiCompute,
);

router.post(
  '/:orgId/exams/sheet/ai-extract-doc',
  ...generateOrgExamSheetFromDocs,
);

export default router;

