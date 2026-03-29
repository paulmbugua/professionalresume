import express from 'express';
import {
  exchangeGoogleAuthCode,
  handleGoogleOAuthCallback,
  startGoogleOAuth,
} from '../controllers/oauthController.js';

const authRouter = express.Router();

authRouter.get('/google', startGoogleOAuth);
authRouter.get('/google/callback', handleGoogleOAuthCallback);
authRouter.post('/google/exchange', exchangeGoogleAuthCode);

export default authRouter;
