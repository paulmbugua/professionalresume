import express from 'express';
import authUser from '../middleware/authUser.js';
import { postReview, getReviews } from '../controllers/reviewController.js';

const reviewRouter = express.Router();

// Route to post a review. This route is protected by the authUser middleware.
reviewRouter.post('/', authUser, postReview);

reviewRouter.get('/', getReviews);

export default reviewRouter;
