// apps/backend/routes/payoutRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import { requestWithdrawal } from '../controllers/payoutController.js';

const router = express.Router();

/**
 * POST /api/payouts/withdraw
 * Body: { currency: 'USD' | 'KES', amount: number }
 * Auth: required (tutor)
 */
router.post('/withdraw', authUser, express.json(), requestWithdrawal);

export default router;
