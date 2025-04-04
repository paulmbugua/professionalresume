import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ✅ Generates a JWT token with configurable expiration.
 * @param {string} id - User ID to encode in the token.
 * @param {string} role - User role (optional, useful for authorization).
 * @param {string} expiresIn - Expiration time (default: '30d').
 * @returns {string} - The signed JWT token.
 */
const generateToken = (id, role = 'user', expiresIn = '30d') => {
  try {
    // ✅ Ensure JWT_SECRET is defined in .env
    if (!process.env.JWT_SECRET) {
      throw new Error('❌ Missing JWT_SECRET in environment variables.');
    }

    // ✅ Sign the token with user ID and optional role
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn });
  } catch (error) {
    console.error('❌ Token Generation Error:', error.message || error);
    throw new Error('Token generation failed.');
  }
};

export default generateToken;
