import express from 'express';
import * as courseController from '../controllers/courseController.js';

const router = express.Router();

// POST /api/courses
router.post('/', courseController.createCourse);

// GET /api/courses
router.get('/', courseController.getCourses);

// GET /api/courses/:id
router.get('/:id', courseController.getCourseById);

// (optional) POST /api/courses/:id/enroll
// router.post('/:id/enroll', courseController.enrollInCourse);

export default router;
