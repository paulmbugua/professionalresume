import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { sendOTP } from '../config/emailService.js'; // you already have this

const TOKEN_TTL = '1d';
const ELEVATED = new Set(['admin', 'superadmin']);

function signUserToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

/**
 * Public/user login (also used by staff). Body: { email, password }
 * Returns: { token, role }
 */
export async function login(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, role, password_hash FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [email]
    );
    const user = rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = signUserToken(user.id);
    return res.json({ success: true, token, role: user.role || null });
  } catch (err) {
    console.error('[auth][login] error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * Superadmin creates a staff account (admin/tutor/etc.).
 * Body: { email, name?, role, tempPassword? }
 *  - If tempPassword omitted, we set a random one and email an OTP for reset.
 */
export async function createStaff(req, res) {
  try {
    // auth: require superadmin (middleware will have set req.adminRole)
    if (req.adminRole !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Superadmin required' });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim() || null;
    const role = String(req.body?.role || '').trim().toLowerCase();
    const tempPassword = String(req.body?.tempPassword || '');

    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    if (!['admin', 'tutor', 'student', 'superadmin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // guard: don’t accidentally create second superadmin unless intentional
    if (role === 'superadmin') {
      console.warn('[auth][createStaff] creating SUPERADMIN:', email);
    }

    // ensure unique email
    const exists = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
    if (exists.rows[0]) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const passwordToUse =
      tempPassword || Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4);
    const hash = await bcrypt.hash(passwordToUse, 12);

    const { rows } = await pool.query(
      `INSERT INTO users (email, name, role, password_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,NOW(),NOW())
       RETURNING id, email, role, name`,
      [email, name, role, hash]
    );

    // Optional: send OTP to force password change
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await pool.query(
        "UPDATE users SET reset_otp = $1, otp_expiry = NOW() + INTERVAL '10 minutes' WHERE id = $2",
        [otp, rows[0].id]
      );
      await sendOTP(email, otp);
    } catch (e) {
      console.warn('[auth][createStaff] could not send OTP (continuing):', e?.message);
    }

    return res.status(201).json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('[auth][createStaff] error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * Optional: ENV-based admin/superadmin login (for bootstrap/maintenance).
 * Body: { email, password }
 * Returns: { token, role }
 */
export async function adminEnvLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    const envEmail = String(process.env.ADMIN_EMAIL || '').toLowerCase();
    const envPass  = String(process.env.ADMIN_PASSWORD || '');

    if (!email || !password || email.toLowerCase() !== envEmail || password !== envPass) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Default to superadmin unless ADMIN_ROLE=admin
    const role = (process.env.ADMIN_ROLE || 'superadmin').toLowerCase() === 'admin'
      ? 'admin'
      : 'superadmin';

    const token = jwt.sign({ id: `${role}:${envEmail}` }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
    return res.json({ success: true, token, role });
  } catch (err) {
    console.error('[auth][adminEnvLogin] error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * Bootstrap: ensure at least one superadmin exists (runs at server start).
 * If none found and ADMIN_EMAIL/PASSWORD present, create a DB user.
 */
export async function ensureSeedSuperadmin() {
  try {
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE LOWER(role) = 'superadmin' LIMIT 1"
    );
    if (rows[0]) return; // already have one

    const envEmail = String(process.env.ADMIN_EMAIL || '').toLowerCase();
    const envPass  = String(process.env.ADMIN_PASSWORD || '');
    if (!envEmail || !envPass) {
      console.warn('[auth][seed] No superadmin in DB and no ADMIN_EMAIL/ADMIN_PASSWORD set.');
      return;
    }

    const hash = await bcrypt.hash(envPass, 12);
    const ins = await pool.query(
      `INSERT INTO users (email, role, password_hash, created_at, updated_at)
       VALUES ($1, 'superadmin', $2, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET role = 'superadmin'
       RETURNING id, email, role`,
      [envEmail, hash]
    );
    console.log('[auth][seed] Superadmin ensured:', ins.rows[0]?.email);
  } catch (e) {
    console.error('[auth][seed] error ensuring superadmin', e);
  }
}
