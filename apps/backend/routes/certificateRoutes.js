// apps/backend/routes/certificateRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import {
  checkEligibility,
  listMyCertificates,
  generateCertificate,
  getCertificate,
  verifyCertificate,
  ogPreview, // NEW
} from '../controllers/certificatesController.js';

const router = express.Router();

// ---- Public (no auth) ----
router.get('/verify/:id', verifyCertificate);   // JSON validity
router.get('/:id/og', ogPreview);               // 302 → OG image

// ---- Private (auth) ----
router.get('/eligibility/:courseId', authUser, checkEligibility);
router.get('/me', authUser, listMyCertificates);
router.get('/:id', authUser, getCertificate);
router.post('/generate', authUser, generateCertificate);

export default router;
