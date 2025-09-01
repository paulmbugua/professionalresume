// apps/backend/routes/ttsAvatarRoutes.js
import express from 'express';
import { speakRobot } from '../controllers/ttsAvatarController.js';

const router = express.Router();

// Route-scoped logger
router.use((req, _res, next) => {
  console.log(
    `[tts] ⇢ ${req.method} ${req.originalUrl} ip=${req.ip} ua="${req.get('user-agent') || ''}"`
  );
  next();
});

// router.post('/speak', authUser, speakRobot);
router.post('/speak', speakRobot);

export default router;
