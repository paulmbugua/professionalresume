import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const authUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not Authorized. Please login again.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the JWT token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    // Set req.user with the token's user id
    req.user = { id: decodedToken.id };

    // Fetch profile information from PostgreSQL using the user id from the token
    const { rows } = await pool.query(
      'SELECT id AS "profileId", role FROM profiles WHERE user_id = $1',
      [req.user.id],
    );

    if (rows.length > 0) {
      req.profile = {
        id: rows[0].profileId, // Now correctly set from the "id" column
        role: rows[0].role,
      };
    } else {
      console.warn(`Profile not found for user ID: ${req.user.id}`);
      return res.status(404).json({ message: 'User profile not found.' });
    }

    console.log('✅ Authenticated User:', req.user, 'Profile:', req.profile);
    next();
  } catch (error) {
    console.error('❌ JWT Verification or Profile Fetch Error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.',
    });
  }
};

export default authUser;
