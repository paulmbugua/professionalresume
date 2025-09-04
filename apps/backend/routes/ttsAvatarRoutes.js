import { Router } from 'express';
import { speakRobot, streamRobot } from '../controllers/ttsAvatarController.js';

const router = Router();

router.post('/speak', speakRobot);
router.get('/stream/:id', streamRobot);

export default router;
