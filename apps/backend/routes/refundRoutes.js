import express from 'express';
import { createRefundRequest } from '../controllers/refundsController.js';
import authUser from '../middleware/authUser.js';
// import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/payment/refunds
router.post('/refunds', authUser, createRefundRequest);

export default router;
