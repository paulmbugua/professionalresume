// apps/backend/routes/courseProgressRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import {
  getProgress,
  updateProgress,
  getProgressSummary,
} from '../controllers/courseProgressController.js';

const router = express.Router();

// Get all weekly progress for a student in a course
router.get('/:courseId', authUser, getProgress);

// Upsert/update a specific week's progress
router.post('/:courseId', authUser, updateProgress);

// Get overall summary (completed weeks, % complete, last updated)
router.get('/:courseId/summary', authUser, getProgressSummary);

export default router;
