// apps/backend/routes/certificateRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import {
  checkEligibility,
  listMyCertificates,
  generateCertificate,
  getCertificate,
  verifyCertificate,
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

router.get('/eligibility/:courseId', authUser, checkEligibility);
router.get('/me', authUser, listMyCertificates);
router.get('/:id', authUser, getCertificate);
router.post('/generate', authUser, generateCertificate);

export default router;
