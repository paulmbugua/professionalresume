import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { confirmUpload, presignUpload } from '../controllers/uploadsController.js';

const router = express.Router();

router.post('/presign', requireAuth, express.json(), presignUpload);
router.post('/confirm', requireAuth, express.json(), confirmUpload);

export default router;
