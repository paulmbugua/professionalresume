import express from 'express';
import { mpesaCallback, b2cResult } from '../controllers/mpesaUrls.js'; // Keeping original controller file name

const router = express.Router();

// ✅ POST: Handle M-Pesa STK Push Callback
router.post('/callback', mpesaCallback);

// ✅ POST: Handle M-Pesa B2C Payment Result (Withdrawals)
router.post('/b2c-result', b2cResult);

export default router;
