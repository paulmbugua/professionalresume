import express from 'express';
import authUser from '../middleware/authUser.js';
import {
  listTopCourses,
  generateOutline,
  generateLessonSSML,
  generateQuiz,
  gradeQuiz,
} from '../controllers/aiCourseController.js';

const router = express.Router();

/**
 * Public AI endpoints (no auth required)
 */
router.get('/courses/top', listTopCourses);
router.post('/outline', generateOutline);
router.post('/lesson-ssml', generateLessonSSML);
router.post('/quiz', generateQuiz);

/**
 * Private (auth) — grading may include user context (optional).
 * We keep it stateless (no DB write) and return {scorePct, passed}.
 * If `passed===true`, the client can call your existing
 *   POST /api/certificates/generate { courseId }
 * to produce the certificate (and then your payment flow handles purchase).
 */
router.post('/grade', authUser, gradeQuiz);

export default router;
