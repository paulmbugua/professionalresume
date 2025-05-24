import pool from '../config/db.js';
import { reviewValidationSchema } from '../validators/reviewValidator.js';

export const postReview = async (req, res) => {
  try {
    // Validate input using Joi
    const { tutorId, comment, rating, sessionId } =
      await reviewValidationSchema.validateAsync(req.body, {
        stripUnknown: true,
      });

    // Get student ID from the authenticated user
    const studentId = req.user.id;

    // Insert review into PostgreSQL
    const newReview = await pool.query(
      `INSERT INTO reviews (tutor_id, student_id, session_id, rating, comment, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING *`,
      [tutorId, studentId, sessionId, rating, comment],
    );

    res.status(201).json({
      message: 'Review posted successfully.',
      review: newReview.rows[0],
    });
  } catch (error) {
    if (error.isJoi) {
      return res
        .status(400)
        .json({ message: 'Validation error.', details: error.details });
    }
    console.error('Error posting review:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Example: GET /api/reviews?tutorId=...
export const getReviews = async (req, res) => {
  try {
    const { tutorId } = req.query;
    if (!tutorId) {
      return res
        .status(400)
        .json({ message: 'Tutor ID is required to fetch reviews.' });
    }

    // Fetch average rating and total reviews
    const ratingData = await pool.query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_reviews 
       FROM reviews 
       WHERE tutor_id = $1`,
      [tutorId],
    );

    const avgRating = ratingData.rows[0].avg_rating || 0;
    const totalReviews = ratingData.rows[0].total_reviews || 0;

    // Fetch all reviews with student details
    const reviewsResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, 
              s.id AS student_id, s.name AS student_name, s.email AS student_email 
       FROM reviews r
       JOIN users s ON r.student_id = s.id
       WHERE r.tutor_id = $1 
       ORDER BY r.created_at DESC`,
      [tutorId],
    );

    // Default to empty array if none found
    const reviews = reviewsResult.rows ?? [];

    res.status(200).json({
      message: 'Reviews fetched successfully.',
      avgRating,
      totalReviews,
      reviews,
    });
  } catch (error) {
    console.error('Error fetching reviews:', error.message || error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
