// apps/backend/routes/payoutRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import { requestWithdrawal } from '../controllers/payoutController.js';

const router = express.Router();
router.post('/withdraw', authUser, requestWithdrawal); // <-- matches the client
export default router;
