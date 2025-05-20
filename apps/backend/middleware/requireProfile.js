import pool from '../config/db.js';

export default async function requireProfile(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id AS "profileId", role FROM profiles WHERE user_id = $1',
      [req.user.id],
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }
    req.profile = { id: rows[0].profileId, role: rows[0].role };
    next();
  } catch (err) {
    console.error('requireProfile Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
