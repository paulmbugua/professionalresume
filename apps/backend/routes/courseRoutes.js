// apps/backend/routes/courseRoutes.js
import express from 'express';
import * as courseController from '../controllers/courseController.js';
import { createAiSandboxCourse } from '../controllers/coursesController.js';
import authUser from '../middleware/authUser.js';
import { normalizeCourseSize } from '../middleware/normalizeCourseSize.js';

// Optional but recommended: protect the AI route specifically
import { aiLimiterStrict, aiKeyFn } from '../middleware/middleware.js';
import { inflightLimiter } from '../middleware/inflightLimiter.js';

const router = express.Router();

/** ---------------------------------------------------------------------------
 *  PUBLIC course lists
 *  --------------------------------------------------------------------------- */
router.get('/', courseController.getCourses);

/** Feature & recommendation endpoints (PUBLIC) — must come BEFORE '/:id' */
router.get('/featured/courses', courseController.getFeaturedCourses);
router.get('/featured/videos',  courseController.getFeaturedVideos);
router.get('/recommendations',  courseController.getRecommendedCourses);

/** Tutor-scoped lists */
router.get('/mine', authUser, courseController.getMyCourses);
router.get('/tutor/:id', courseController.getTutorCourses);

/** Create (protected) */
router.post('/', authUser, courseController.createCourse);

/** ---------------------------------------------------------------------------
 *  AI course helpers (keep BEFORE '/:id')
 *  POST /api/courses/ai-sandbox
 *  --------------------------------------------------------------------------- */
router.post(
  '/ai-sandbox',
  // per-user concurrent cap (env: AI_MAX_INFLIGHT, default 2)
  inflightLimiter({ keyFn: aiKeyFn, max: Number(process.env.AI_MAX_INFLIGHT || 2) }),
  // sliding-window limiter (per-user, per-bucket)
  aiLimiterStrict,
  // normalize inputs used by the AI pipeline
  normalizeCourseSize,
  createAiSandboxCourse
);

/** ---------------------------------------------------------------------------
 *  Read/Update/Delete — '/:id' comes AFTER the static routes above
 *  --------------------------------------------------------------------------- */
router.get('/:id', courseController.getCourseById);
router.post('/:id/purchase', authUser, courseController.purchaseCourse);
router.patch('/:id', authUser, courseController.updateCourse);
router.delete('/:id', authUser, courseController.deleteCourse);

export default router;
