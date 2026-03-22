import express from 'express';
import requireAuth from '../middleware/auth.js';
import {
  createPaystackOrder,
  confirmMpesa,
  ensureEntitlement,
  getEntitlement,
  getCvPaymentConfig,
  initMpesa,
  verifyPaystack,
} from '../controllers/cvPaymentController.js';

const r = express.Router();

r.get('/config', getCvPaymentConfig);
r.post('/mpesa/init', requireAuth, initMpesa);
r.post('/mpesa/confirm', requireAuth, confirmMpesa);
r.post('/paystack/create-order', requireAuth, createPaystackOrder);
r.get('/paystack/verify/:reference', requireAuth, verifyPaystack);
r.get('/entitlement', requireAuth, getEntitlement);
r.post('/entitlement/ensure', requireAuth, ensureEntitlement);

export default r;
