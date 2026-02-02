// apps/backend/controllers/userController.js
import { OAuth2Client } from 'google-auth-library';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // For OTP generation
import pool from '../config/db.js';
import { sendOTP } from '../config/emailService.js'; // Email service for OTPs
import { admin } from '../bootstrap/firebaseAdmin.js';

// Initialize your Google client with *one* of your client IDs (the one you want to primarily verify).
// We'll still pass both in the verify call below.
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB);

// Helper to sign your own JWTs
const createToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

/** --------------------
 *  User Login (email/password)
 -------------------- */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.password) {
      return res
        .status(400)
        .json({
          success: false,
          message: 'Please log in with Google (this account has no password)',
        });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = createToken(user.id);
    return res.json({ success: true, token, message: 'Login successful' });

  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** --------------------
 *  User Registration
 -------------------- */

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedRole = (role || 'user').toString().trim().toLowerCase();

    if (!name || !email?.trim() || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Name, email, and password are required' });
    }
    if (!validator.isEmail(email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    if (!['user', 'admin', 'superadmin'].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const exists = await pool.query('SELECT 1 FROM users WHERE email = $1', [email.trim()]);
    if (exists.rows.length) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const insertUser = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, email.trim(), hashed, normalizedRole]
    );
    const userId = insertUser.rows[0].id;

    const token = createToken(userId);
    return res.status(201).json({ success: true, token, message: 'Sign up successful' });

  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** --------------------
 *  Get Logged‐In User
 -------------------- */
export const getUser = async (req, res) => {
  try {
    const rawId = req.user?.id;
    if (!rawId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Keep your existing admin token shortcut
    if (typeof rawId === 'string' && rawId.startsWith('admin:')) {
      const email = rawId.slice(6);
      return res.json({
        success: true,
        userId: null,
        email,
        tokens: 0,
        role: 'admin',
        name: 'Admin', // include a name for admin tokens
      });
    }

    const userId = Number(rawId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // 1) Base user info (same as before)
    const { rows } = await pool.query(
      `
      SELECT
        u.id,
        u.email,
        u.tokens,
        u.role,
        COALESCE(p.name, u.name) AS name
      FROM users u
      LEFT JOIN LATERAL (
        SELECT name
        FROM profiles
        WHERE user_id = u.id
        ORDER BY id DESC
        LIMIT 1
      ) p ON TRUE
      WHERE u.id = $1
      `,
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const u = rows[0];

    // 2) 🟢 NEW: pull latest org_learner_profiles row for this user (photo_url, class_label, etc.)
    const lpRes = await pool.query(
      `
        SELECT *
        FROM org_learner_profiles
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [userId]
    );

    const orgLearnerProfile = lpRes.rows[0] || null;

    // 3) Build response object (keep existing shape, just extend)
    const payload = {
      success: true,
      userId: u.id,
      email: u.email,
      tokens: u.tokens || 0,
      role: u.role,
      name: u.name || '',
    };

    // Expose profile under multiple keys (snake + camel + array),
    // so all current/future consumers are happy.
    if (orgLearnerProfile) {
      payload.org_learner_profile = orgLearnerProfile;
      payload.orgLearnerProfile = orgLearnerProfile;
      payload.org_learner_profiles = [orgLearnerProfile];
    }

    return res.json(payload);
  } catch (err) {
    console.error('getUser Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


/** --------------------
 *  Password Reset Flow
 -------------------- */
export const requestPasswordReset = async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const email = rawEmail && rawEmail.toString().trim();

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: 'Email is required' });
    }

    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );

    // You can choose to NOT leak user existence. For now, keep your old behaviour.
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Store in existing columns: otp, otp_expiration
    await pool.query(
      `
      UPDATE users
         SET otp = $1,
             otp_expiration = NOW() + INTERVAL '10 minutes',
             updated_at = NOW()
       WHERE email = $2
      `,
      [otp, email]
    );

    await sendOTP(email, otp);

    return res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('requestPasswordReset Error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error' });
  }
};

export const verifyOTPAndResetPassword = async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const email = rawEmail && rawEmail.toString().trim();
    const otp = req.body?.otp && req.body.otp.toString().trim();
    const newPassword = req.body?.newPassword && req.body.newPassword.toString();

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields required' });
    }

    const { rows } = await pool.query(
      `
      SELECT id, otp, otp_expiration
        FROM users
       WHERE email = $1
         AND deleted_at IS NULL
      `,
      [email]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    const user = rows[0];

    // Check OTP match + expiry
    const now = new Date();
    const expiry = user.otp_expiration
      ? new Date(user.otp_expiration)
      : null;

    if (user.otp !== otp || !expiry || expiry < now) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (newPassword.trim().length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const hash = await bcrypt.hash(newPassword.trim(), 10);

    await pool.query(
      `
      UPDATE users
         SET password         = $1,
             otp              = NULL,
             otp_expiration   = NULL,
             must_change_password = FALSE,
             updated_at       = NOW()
       WHERE email = $2
      `,
      [hash, email]
    );

    return res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('verifyOTP Error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Server error' });
  }
};

/** --------------------
 *  Google Login
 -------------------- */
export const googleLogin = async (req, res) => {
  try {
    const rawToken = req.body.token || req.body.idToken; // accept either field
    const preferredName = (req.body.name || '').toString().trim().slice(0, 80);

    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({ success: false, message: 'Token missing' });
    }

    // Decode JWT payload safely (base64url)
    const decodePayload = (t) => {
      const parts = t.split('.');
      if (parts.length !== 3) return null;
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
      try { return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')); }
      catch { return null; }
    };

    const payload = decodePayload(rawToken);
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Malformed token' });
    }

    const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'mytutorapp-d3c91';
    const allowedAudiences = [
      process.env.GOOGLE_CLIENT_ID_WEB,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
      process.env.GOOGLE_CLIENT_ID_IOS,
    ].filter(Boolean);

    let email, googleId, displayName;

    // Path A: Firebase ID token
    if (
      typeof payload.iss === 'string' &&
      payload.iss.startsWith('https://securetoken.google.com/')
    ) {
      if (payload.aud !== PROJECT_ID) {
        return res.status(401).json({ success: false, message: 'Token audience mismatch' });
      }
      // Verify with Firebase Admin (throws if invalid/expired)
      const decoded = await admin.auth().verifyIdToken(rawToken);
      email = decoded.email;
      googleId = decoded.uid; // Firebase UID
      displayName = preferredName || decoded.name || email || '';
    }
    // Path B: Google ID token
    else if (
      payload.iss === 'https://accounts.google.com' ||
      payload.iss === 'accounts.google.com'
    ) {
      const ticket = await googleClient.verifyIdToken({
        idToken: rawToken,
        audience: allowedAudiences.length ? allowedAudiences : undefined,
      });
      const g = ticket.getPayload();
      if (!g) {
        return res.status(401).json({ success: false, message: 'Invalid Google token' });
      }
      if (g.aud && allowedAudiences.length && !allowedAudiences.includes(g.aud)) {
        return res.status(401).json({ success: false, message: 'Google audience mismatch' });
      }
      if (g.email_verified === false) {
        return res.status(401).json({ success: false, message: 'Email not verified' });
      }
      email = g.email;
      googleId = g.sub; // Google subject
      displayName = preferredName || g.name || email || '';
    }
    // Unknown issuer
    else {
      return res.status(400).json({ success: false, message: 'Unsupported token issuer' });
    }

    if (!email || !googleId) {
      return res.status(400).json({ success: false, message: 'Invalid token claims' });
    }

    // ⚡ Single UPSERT (fill empty name; set google_id if missing)
    const { rows } = await pool.query(
      `
      INSERT INTO users (name, email, google_id, role)
      VALUES ($1, $2, $3, 'user')
      ON CONFLICT (email) DO UPDATE
      SET
        name      = CASE WHEN COALESCE(users.name, '') = '' THEN EXCLUDED.name ELSE users.name END,
        google_id = COALESCE(users.google_id, EXCLUDED.google_id),
        role      = COALESCE(users.role, 'user')
      RETURNING id, email, name, role
      `,
      [displayName || email, email, googleId]
    );

    const user = rows[0];
    const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    return res.status(200).json({
      success: true,
      token: jwtToken,
      role: user.role || null,
      userId: user.id,
      name: user.name || '',
      needsRole: !user.role, // helpful hint for clients (optional)
    });
  } catch (error) {
    console.error('Google Login Error:', error);
    return res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
};

/** --------------------
 *  Update User Role
 -------------------- */

export const updateUserRole = async (req, res) => {
  const client = await pool.connect();
  try {
    const rawId = req.user?.id;
    if (!rawId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userId = Number(rawId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const { role } = req.body || {};
    const normalizedRole = (role || '').toString().trim().toLowerCase();
    if (!normalizedRole || !['user', 'admin', 'superadmin'].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Load current user (fallback name, etc.)
    const { rows: u0 } = await client.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );
    if (!u0.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await client.query('BEGIN');

    // Update users.role (and name if provided)
    const cleanName = (req.body.name ?? '').toString().trim();
    const { rows: u1 } = await client.query(
      `
      UPDATE users
         SET role = $1,
             name = CASE WHEN $2 <> '' THEN $2 ELSE name END,
             updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, role, name, tokens
      `,
      [normalizedRole, cleanName, userId]
    );
    const updatedUser = u1[0];

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Role updated',
      role: updatedUser.role,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        tokens: updatedUser.tokens || 0,
      },
      profile: null,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    if (err?.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Conflicting record already exists.',
        detail: err?.detail || 'Unique constraint violation',
      });
    }
    console.error('[updateUserRole] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};
export async function deleteUser(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Optional: lock the row so concurrent requests don't race
    await client.query('SELECT id FROM public.users WHERE id = $1 FOR UPDATE', [userId]);

    await client.query(
      `
      UPDATE public.users
      SET
        name             = 'Deleted User',
        email            = CONCAT('deleted+', id::text, '@example.invalid'),
        password         = NULL,
        google_id        = NULL,
        otp              = NULL,
        otp_expiration   = NULL,
        tokens           = 0,
        is_active        = FALSE,
        deleted_at       = NOW(),
        updated_at       = NOW(),
        onboarding_state = NULL
      WHERE id = $1
      `,
      [userId]
    );

    // Optional: revoke sessions/tokens in your auth store here
    // await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('deleteUser error:', err);
    return res.status(500).json({ message: 'Failed to delete account' });
  } finally {
    client.release();
  }
}

/** --------------------
 *  Admin Login
 -------------------- */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email & password required' });
    }

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = createToken('admin:' + email);
      return res.json({ success: true, token, message: 'Admin logged in' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, 'admin']
    );
    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }
    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const token = createToken(admin.id);
    return res.json({ success: true, token, message: 'Admin logged in' });

  } catch (err) {
    console.error('adminLogin Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
