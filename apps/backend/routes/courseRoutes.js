// routes/courseRoutes.js
import express from 'express';
import * as courseController from '../controllers/courseController.js';
import authUser from '../middleware/authUser.js';

const router = express.Router();

/** Public-ish list of all courses */
router.get('/', courseController.getCourses);

/** Feature & recommendation endpoints (PUBLIC) — must come BEFORE '/:id' */
router.get('/featured/courses', courseController.getFeaturedCourses);
router.get('/featured/videos',  courseController.getFeaturedVideos);
router.get('/recommendations',   courseController.getRecommendedCourses);

/** Tutor-scoped lists */
router.get('/mine', authUser, courseController.getMyCourses);
router.get('/tutor/:id', courseController.getTutorCourses);

/** Create (protected) */
router.post('/', authUser, courseController.createCourse);

/** Read one by id — must come *after* the static routes above */
router.get('/:id', courseController.getCourseById);
router.post('/:id/purchase', authUser, courseController.purchaseCourse);


/** Update/Delete (protected) */
router.patch('/:id', authUser, courseController.updateCourse);
router.delete('/:id', authUser, courseController.deleteCourse);

export default router;
