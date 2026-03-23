import express from 'express';
import authOptional from '../middleware/authOptional.js';
import {
  confirmUpload,
  presignUpload,
} from '../controllers/uploadsController.js';

const router = express.Router();

router.post('/presign', authOptional, express.json(), presignUpload);
router.post('/confirm', authOptional, express.json(), confirmUpload);

export default router;
