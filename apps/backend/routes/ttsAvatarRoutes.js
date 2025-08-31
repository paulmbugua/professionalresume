// apps/backend/routes/ttsAvatarRoutes.js
import express from 'express';
import { speakRobot } from '../controllers/ttsAvatarController.js';
// import authUser from '../middleware/authUser.js';

const router = express.Router();

// router.post('/speak', authUser, speakRobot); // protected
router.post('/speak', speakRobot);             // public for now

export default router;
