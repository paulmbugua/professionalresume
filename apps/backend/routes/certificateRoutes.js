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
  getStatus,
} from '../controllers/certificatesController.js';

const router = express.Router();
const UUID_RE =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}';
// ---- Public (no auth) ----
router.get(`/verify/:id(${UUID_RE})`, verifyCertificate);
router.get(`/:id(${UUID_RE})/og`, ogPreview);

// ---- Private (auth) ----
// IMPORTANT: put this BEFORE '/:id'
router.get(`/:id(${UUID_RE})/download`, authUser, downloadCertificate);


router.get('/status', authUser, getStatus);

router.get('/eligibility/:courseId', authUser, checkEligibility);
router.get('/me', authUser, listMyCertificates);
router.get(`/:id(${UUID_RE})`, authUser, getCertificate);
router.post('/generate', authUser, generateCertificate);

export default router;
