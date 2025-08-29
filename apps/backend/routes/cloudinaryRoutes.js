// routes/cloudinaryRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import { getDirectUploadSignature } from '../controllers/cloudinaryController.js';

const router = express.Router();

// Signed uploads (user must be authenticated)
router.post('/sign', authUser, express.json(), getDirectUploadSignature);

export default router;
