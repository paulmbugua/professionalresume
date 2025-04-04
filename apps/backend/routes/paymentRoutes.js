import express from 'express';
import {
  getPackages,
  initializeMpesaPayment,
  handleMpesaPaymentSuccess,
  useTokensForService,
  getTransactions,
  confirmMpesaPayment,
  updateMpesaReference,
} from '../controllers/paymentController.js';
import authUser from '../middleware/authUser.js'; // Ensure authentication middleware is used

const router = express.Router();

/**
 * ✅ Public Routes (Accessible to everyone)
 */
router.get('/packages', getPackages); // Fetch available packages

/**
 * ✅ Protected Routes (User Authentication Required)
 */
router.post('/initiate', authUser, initializeMpesaPayment); // Initiate M-Pesa Payment
router.post('/success', authUser, handleMpesaPaymentSuccess); // Handle Successful Payment
router.post('/use-tokens', authUser, useTokensForService); // Deduct Tokens for Services
router.get('/transactions', authUser, getTransactions); // Get User Transactions
router.put('/confirm', authUser, confirmMpesaPayment); // Confirm Payment Status
router.put('/update-mpesa', authUser, updateMpesaReference);

export default router;
