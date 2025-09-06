// apps/backend/middleware/adminAuth.js
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

/**
 * Accepts:
 *  - Tokens signed by your JWT_SECRET
 *  - Payload.id being either:
 *      "admin:<email>"  (from env ADMIN_EMAIL/ADMIN_PASSWORD login), OR
 *      a numeric user id whose users.role === 'admin'
 */
export async function adminAuth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Missing token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const id = payload?.id;

    // Allow direct admin token e.g. "admin:email"
    if (typeof id === 'string' && id.startsWith('admin:')) {
      req.admin = { email: id.slice(6) };
      return next();
    }

    // Or allow a user row with admin role
    const userIdNum = Number(id);
    if (!Number.isFinite(userIdNum)) {
      return res.status(403).json({ success: false, message: 'Invalid admin token' });
    }

    const { rows } = await pool.query('SELECT role FROM users WHERE id = $1 LIMIT 1', [userIdNum]);
    if (!rows[0] || rows[0].role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin role required' });
    }

    req.adminUserId = userIdNum;
    return next();
  } catch (err) {
    console.error('[adminAuth] error', err);
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}
