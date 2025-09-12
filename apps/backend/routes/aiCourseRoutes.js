// apps/backend/routes/aiRoutes.js
import express from 'express';
import {
  listTopCourses,
  generateOutline,
  generateLessonSSML,
  generateQuiz,
  gradeQuiz,
  generateCoursePackage,
  // Cache admin handlers
  clearCourseCache,
  clearTopCoursesCache,
} from '../controllers/aiCourseController.js';
import { normalizeCourseSize } from '../middleware/normalizeCourseSize.js';

// 🔒 assignment-aware guards
import requireAuthWhenAssignment from '../middleware/requireAuthWhenAssignment.js';
import enforceAssignmentKnobs from '../middleware/enforceAssignmentKnobs.js';

const router = express.Router();

/**
 * Public (self-serve) listing
 * Learners coming from invites can still see titles, but generation
 * below is locked if `assignmentId` is present.
 */
router.get('/courses/top', listTopCourses);

/**
 * Any POST that might generate content:
 * If `assignmentId` is present:
 *   1) require auth
 *   2) force minutes/lessons/quiz/courseId from org locked_config
 * Then run normalizers and controllers.
 */

router.post(
  '/outline',
  requireAuthWhenAssignment,
  enforceAssignmentKnobs,
  normalizeCourseSize,
  generateOutline
);

router.post(
  '/lesson-ssml',
  requireAuthWhenAssignment,
  enforceAssignmentKnobs,
  normalizeCourseSize,
  generateLessonSSML
);

router.post(
  '/quiz',
  requireAuthWhenAssignment,
  enforceAssignmentKnobs,
  normalizeCourseSize,
  generateQuiz
);

router.post(
  '/grade',
  requireAuthWhenAssignment,
  enforceAssignmentKnobs,
  gradeQuiz
);

router.post(
  '/course-package',
  requireAuthWhenAssignment,
  enforceAssignmentKnobs,
  normalizeCourseSize,
  generateCoursePackage
);

/**
 * Cache admin routes (POST to avoid accidental clears via GET).
 * If you want to lock these further, add your admin guard middleware here.
 */
router.post('/cache/clear-course', clearCourseCache);
router.post('/cache/clear-top-courses', clearTopCoursesCache);

export default router;
