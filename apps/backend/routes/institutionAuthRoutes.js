// apps/backend/routes/institutionAuthRoutes.js
import express from 'express';
import {
  institutionLogin,
  institutionRegister,
  institutionGoogleLogin,
  institutionRequestPasswordReset,
  institutionVerifyOTPAndResetPassword,
} from '../controllers/institutionAuthController.js';

const router = express.Router();

// Base: /api/institutions/auth
router.post('/login', institutionLogin);
router.post('/register', institutionRegister);
router.post('/google', institutionGoogleLogin);
router.post('/password/request-otp', institutionRequestPasswordReset);
router.post('/password/verify', institutionVerifyOTPAndResetPassword);

export default router;
