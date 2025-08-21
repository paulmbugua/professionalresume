// routes/enrollmentRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';

import {
  createEnrollment,
  getEnrollmentsByStudent,
  getEnrollmentsByCourse,
  cancelEnrollment,
} from '../controllers/enrollmentController.js';

const router = express.Router();

// POST   /api/enrollments
router.post('/', authUser, createEnrollment);

// GET    /api/enrollments/student/:studentId
router.get('/student/:studentId', authUser, getEnrollmentsByStudent);

// GET    /api/enrollments/course/:courseId
router.get('/course/:courseId', authUser, getEnrollmentsByCourse);

// DELETE /api/enrollments/:id
router.delete('/:id', authUser, cancelEnrollment);

export default router;
