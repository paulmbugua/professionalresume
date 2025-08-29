// apps/backend/routes/paypalRoutes.js
import express from 'express';
import { createOrder, captureOrder } from '../controllers/paypalController.js';
import authUser from '../middleware/authUser.js';

const router = express.Router();

router.post('/create-order', authUser, createOrder);
router.post('/capture-order/:id', authUser, captureOrder);

export default router;
