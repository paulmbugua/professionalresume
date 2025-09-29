// apps/backend/routes/attemptsRoutes.js
import express from 'express';
import anyAuth from '../middleware/anyAuth.js';
import {
  startAttempt,
  heartbeatAttempt,
  submitAttempt,
} from '../controllers/attemptsController.js';

const router = express.Router();

// All require auth
router.post('/start', anyAuth, startAttempt);
router.post('/heartbeat', anyAuth, heartbeatAttempt);
router.post('/submit', anyAuth, submitAttempt);

export default router;
