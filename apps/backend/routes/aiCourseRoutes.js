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

// 🔒 assignment-aware guards
import requireAuthWhenAssignment from '../middleware/requireAuthWhenAssignment.js';
import enforceAssignmentKnobs from '../middleware/enforceAssignmentKnobs.js';

/**
 * NOTE:
 * normalizeCourseSize is applied globally in server.js:
 *   app.use('/api/ai', normalizeCourseSize)
 * Do NOT mount it here again to avoid double-execution.
 */

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
 * Then controllers run (with course size already normalized at server level).
 */

router.post(
  '/outline',
  requireAuthWhenAssignment,
  enforceAssignmentKnobs,
  generateOutline
);

router.post(
  '/lesson-ssml',
  requireAuthWhenAssignment,
  enforceAssignmentKnobs,
  generateLessonSSML
);

router.post(
  '/quiz',
  requireAuthWhenAssignment,
  enforceAssignmentKnobs,
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
  generateCoursePackage
);

/**
 * Cache admin routes (POST to avoid accidental clears via GET).
 * If you want to lock these further, add your admin guard middleware here.
 */
router.post('/cache/clear-course', clearCourseCache);
router.post('/cache/clear-top-courses', clearTopCoursesCache);

export default router;
