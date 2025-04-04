import jwt from 'jsonwebtoken';
import pool from '../config/db.js'; // PostgreSQL connection

const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔹 Authorization Header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ success: false, message: 'Not Authorized. Login Again.' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔹 Extracted Token:', token);

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔹 Decoded Token:', decodedToken);

    // Retrieve admin details from PostgreSQL
    const { rows } = await pool.query(
      'SELECT email FROM users WHERE role = $1',
      ['admin'],
    );
    const adminEmails = rows.map((row) => row.email);

    // Ensure the token belongs to a valid admin
    if (!adminEmails.includes(decodedToken.email)) {
      return res
        .status(403)
        .json({ success: false, message: 'Not Authorized. Login Again.' });
    }

    req.user = decodedToken; // Attach the decoded user info to `req.user`
    next(); // Proceed if token is valid
  } catch (error) {
    console.error('❌ Token Verification Error:', error);

    if (error.name === 'TokenExpiredError') {
      return res
        .status(401)
        .json({
          success: false,
          message: 'Session expired. Please login again.',
        });
    }

    res
      .status(401)
      .json({ success: false, message: 'Invalid token. Please login again.' });
  }
};

export default adminAuth;
