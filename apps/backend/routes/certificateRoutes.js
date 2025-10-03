// apps/backend/routes/certificateRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import {
  checkEligibility,
  listMyCertificates,
  generateCertificate,
  getCertificate,
  verifyCertificate,
  getCertificateStatus,
  ogPreview,
  downloadCertificate,        // ⬅️ add this import
} from '../controllers/certificatesController.js';

const router = express.Router();

// ---- Public (no auth) ----
router.get('/verify/:id', verifyCertificate);   // JSON validity
router.get('/:id/og', ogPreview);               // 302 → OG image

// ---- Private (auth) ----
// IMPORTANT: put this BEFORE '/:id'
router.get('/:id/download', authUser, downloadCertificate);  // ⬅️ add this
router.get('/status', authUser, getCertificateStatus);
router.get('/eligibility/:courseId', authUser, checkEligibility);
router.get('/me', authUser, listMyCertificates);
router.get('/:id', authUser, getCertificate);

router.get(
  '/:id([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})',
  authUser,
  getCertificate
);

router.post('/generate', authUser, generateCertificate);

export default router;
