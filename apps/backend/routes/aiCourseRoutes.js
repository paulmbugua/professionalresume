// apps/backend/routes/aiRoutes.js
import express from 'express';
import {
  listTopCourses,
  generateOutline,
  generateLessonSSML,
  generateQuiz,
  gradeQuiz,
  generateCoursePackage,
  // NEW: cache admin handlers
  clearCourseCache,
  clearTopCoursesCache,
} from '../controllers/aiCourseController.js';
import { normalizeCourseSize } from '../middleware/normalizeCourseSize.js';

const router = express.Router();

// apply only where relevant
router.get('/courses/top', listTopCourses);
router.post('/outline', normalizeCourseSize, generateOutline);
router.post('/lesson-ssml', normalizeCourseSize, generateLessonSSML);
router.post('/quiz', normalizeCourseSize, generateQuiz);
router.post('/grade', gradeQuiz);
router.post('/course-package', normalizeCourseSize, generateCoursePackage);

// ─────────────────────────────────────────────────────────
// Cache admin routes (POST to avoid accidental clears via GET)
// ─────────────────────────────────────────────────────────
router.post('/cache/clear-course', clearCourseCache);
router.post('/cache/clear-top-courses', clearTopCoursesCache);

export default router;
