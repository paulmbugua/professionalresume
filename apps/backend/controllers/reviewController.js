// packages/shared/api/src/controllers/reviews.js
import pool from '../config/db.js'
import { reviewValidationSchema } from '../validators/reviewValidator.js'

export const postReview = async (req, res) => {
  try {
    // Validate input
    const { tutorId, comment, rating, sessionId } =
      await reviewValidationSchema.validateAsync(req.body, {
        stripUnknown: true,
      })

    // Authenticated student
    const studentId = req.user.id

    // Insert
    const newReview = await pool.query(
      `INSERT INTO reviews 
         (tutor_id, student_id, session_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [tutorId, studentId, sessionId, rating, comment]
    )

    return res.status(201).json({
      message: 'Review posted successfully.',
      review: newReview.rows[0],
    })
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ message: 'Validation error.', details: err.details })
    }
    console.error('Error posting review:', err)
    return res.status(500).json({ message: 'Internal server error.' })
  }
}

export const getReviews = async (req, res) => {
  try {
    const { tutorId } = req.query
    if (!tutorId || typeof tutorId !== 'string') {
      return res.status(400).json({ message: 'Tutor ID is required to fetch reviews.' })
    }

    // 1) avg + count
    const { rows: stats } = await pool.query(
      `SELECT 
         AVG(rating)   AS avg_rating, 
         COUNT(*)      AS total_reviews 
       FROM reviews 
       WHERE tutor_id = $1`,
      [tutorId]
    )
    const avgRating    = stats[0].avg_rating    ?? 0
    const totalReviews = stats[0].total_reviews ?? 0

    // 2) grab each review + student info
    const { rows } = await pool.query(
      `SELECT
         r.id,
         r.session_id,
         r.rating,
         r.comment,
         r.created_at,
         u.id   AS student_id,
         u.name AS student_name
       FROM reviews r
       JOIN users u
         ON u.id = r.student_id
       WHERE r.tutor_id = $1
       ORDER BY r.created_at DESC`,
      [tutorId]
    )

    // 3) normalize to your shared types (strings & camelCase)
    const reviews = rows.map(r => ({
      id:           r.id.toString(),
      tutorId:      tutorId,
      sessionId:    r.session_id.toString(),
      rating:       r.rating.toString(),
      comment:      r.comment,
      createdAt:    r.created_at,
      studentId:    r.student_id.toString(),
      studentName:  r.student_name,
    }))

    return res.status(200).json({
      message:      'Reviews fetched successfully.',
      avgRating:    avgRating.toString(),
      totalReviews: totalReviews.toString(),
      reviews,
    })
  } catch (err) {
    console.error('Error fetching reviews:', err)
    return res.status(500).json({ message: 'Internal server error.' })
  }
}
