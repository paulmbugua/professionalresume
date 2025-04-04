import express from 'express';
import {
  handlePaystackWebhook,
  handleZoomWebhook,
} from '../controllers/webhookController.js';

const router = express.Router();

/**
 * ✅ Webhook Routes
 * - Paystack webhook requires JSON body parsing
 * - Zoom webhook may need additional security validations
 */

// Paystack Webhook (Ensure it processes JSON data)
router.post('/webhook/paystack', express.json(), handlePaystackWebhook);

// Zoom Webhook (Security improvements recommended)
router.post('/webhook/zoom', express.json(), handleZoomWebhook);

export default router;
