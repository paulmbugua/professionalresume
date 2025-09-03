// apps/backend/routes/aiRoutes.js (or wherever you wire controllers)
import express from 'express';
import {
  listTopCourses,
  generateOutline,
  generateLessonSSML,
  generateQuiz,
  gradeQuiz,
  generateCoursePackage,
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

export default router;
