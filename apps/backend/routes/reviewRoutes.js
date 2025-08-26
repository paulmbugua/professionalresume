// routes/reviewRoutes.js
import express from 'express';
import authUser from '../middleware/authUser.js';
import {
  // tutor reviews (existing)
  postTutorReview,
  getTutorReviews,
  // NEW: video reviews
  postVideoReview,
  getVideoReviews,
  // NEW: course reviews
  postCourseReview,
  getCourseReviews,
} from '../controllers/reviewController.js';

const reviewRouter = express.Router();

/**
 * Tutor reviews (your existing ones), kept for backward compatibility
 */
reviewRouter.post('/', authUser, postTutorReview);
reviewRouter.get('/', getTutorReviews);

/**
 * Recorded video reviews
 * POST /api/reviews/videos/:videoId   { rating:1..5, comment? }
 * GET  /api/reviews/videos/:videoId   -> { avgRating, totalReviews, reviews:[...] }
 */
reviewRouter.post('/videos/:videoId', authUser, postVideoReview);
reviewRouter.get('/videos/:videoId', getVideoReviews);

/**
 * Course reviews
 * POST /api/reviews/courses/:courseId { rating:1..5, comment? }
 * GET  /api/reviews/courses/:courseId -> { avgRating, totalReviews, reviews:[...] }
 */
reviewRouter.post('/courses/:courseId', authUser, postCourseReview);
reviewRouter.get('/courses/:courseId', getCourseReviews);

export default reviewRouter;
