// apps/backend/controllers/institutionAuthController.js
import { OAuth2Client } from 'google-auth-library';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import { sendOTP } from '../config/emailService.js';
import { admin } from '../bootstrap/firebaseAdmin.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB);
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

/** Email/password login (no role logic) */
export const institutionLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email.trim()]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'User not found' });

    const user = rows[0];
    if (!user.password) {
      return res.status(400).json({ success: false, message: 'Use Google sign-in for this account' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = signToken(user.id);
    return res.json({ success: true, token, message: 'Login successful' });
  } catch (e) {
    console.error('[institutionLogin]', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Registration (no role asked; silently defaults to 'tutor' to avoid student profile flow) */
export const institutionRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (!validator.isEmail(email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const exists = await pool.query('SELECT 1 FROM users WHERE email=$1', [email.trim()]);
    if (exists.rows.length) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id',
      [name.trim().slice(0,80), email.trim(), hashed, 'tutor'] // ← default role; no profile creation
    );
    const token = signToken(rows[0].id);
    return res.status(201).json({ success: true, token, message: 'Sign up successful' });
  } catch (e) {
    console.error('[institutionRegister]', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Google sign-in (no role gating) */
export const institutionGoogleLogin = async (req, res) => {
  try {
    const rawToken = req.body.token || req.body.idToken;
    const preferredName = (req.body.name || '').toString().trim().slice(0, 80);
    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(400).json({ success: false, message: 'Token missing' });
    }

    // Decode payload softly
    const decodePayload = (t) => {
      const parts = String(t).split('.');
      if (parts.length !== 3) return null;
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        .padEnd(Math.ceil(parts[1].length/4)*4, '=');
      try { return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')); } catch { return null; }
    };
    const payload = decodePayload(rawToken);
    if (!payload) return res.status(400).json({ success: false, message: 'Malformed token' });

    const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'mytutorapp-d3c91';
    const allowedAudiences = [
      process.env.GOOGLE_CLIENT_ID_WEB,
      process.env.GOOGLE_CLIENT_ID_ANDROID,
      process.env.GOOGLE_CLIENT_ID_IOS,
    ].filter(Boolean);

    let email, googleId, displayName;

    // Firebase ID token path
    if (typeof payload.iss === 'string' && payload.iss.startsWith('https://securetoken.google.com/')) {
      if (payload.aud !== PROJECT_ID) {
        return res.status(401).json({ success: false, message: 'Token audience mismatch' });
      }
      const decoded = await admin.auth().verifyIdToken(rawToken);
      email = decoded.email;
      googleId = decoded.uid;
      displayName = preferredName || decoded.name || email || '';
    }
    // Google ID token path
    else if (payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com') {
      const ticket = await googleClient.verifyIdToken({
        idToken: rawToken,
        audience: allowedAudiences.length ? allowedAudiences : undefined,
      });
      const g = ticket.getPayload();
      if (!g) return res.status(401).json({ success: false, message: 'Invalid Google token' });
      if (g.aud && allowedAudiences.length && !allowedAudiences.includes(g.aud)) {
        return res.status(401).json({ success: false, message: 'Google audience mismatch' });
      }
      if (g.email_verified === false) {
        return res.status(401).json({ success: false, message: 'Email not verified' });
      }
      email = g.email;
      googleId = g.sub;
      displayName = preferredName || g.name || email || '';
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported token issuer' });
    }

    if (!email || !googleId) {
      return res.status(400).json({ success: false, message: 'Invalid token claims' });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO users (name, email, google_id)
      VALUES ($1,$2,$3)
      ON CONFLICT (email) DO UPDATE
      SET name      = CASE WHEN COALESCE(users.name,'')='' THEN EXCLUDED.name ELSE users.name END,
          google_id = COALESCE(users.google_id, EXCLUDED.google_id)
      RETURNING id, email, name, role
      `,
      [displayName || email, email, googleId]
    );

    const user = rows[0];
    const token = signToken(user.id);
    return res.status(200).json({ success: true, token, userId: user.id, name: user.name || '' });
  } catch (e) {
    console.error('[institutionGoogleLogin]', e);
    return res.status(500).json({ success: false, message: 'Google authentication failed' });
  }
};

/** Request OTP for password reset (shared semantics) */
export const institutionRequestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email?.trim()) return res.status(400).json({ success: false, message: 'Email is required' });

    const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [email.trim()]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const otp = crypto.randomInt(100000, 999999).toString();
    await pool.query(
      "UPDATE users SET reset_otp=$1, otp_expiry = NOW() + INTERVAL '10 minutes' WHERE email=$2",
      [otp, email.trim()]
    );
    await sendOTP(email.trim(), otp);
    return res.json({ success: true, message: 'OTP sent' });
  } catch (e) {
    console.error('[institutionRequestPasswordReset]', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const institutionVerifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }
    const { rows } = await pool.query('SELECT reset_otp, otp_expiry FROM users WHERE email=$1', [email.trim()]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    const u = rows[0];
    if (u.reset_otp !== otp || new Date(u.otp_expiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    const hash = await bcrypt.hash(newPassword.trim(), 10);
    await pool.query('UPDATE users SET password=$1, reset_otp=NULL, otp_expiry=NULL WHERE email=$2', [hash, email.trim()]);
    return res.json({ success: true, message: 'Password updated' });
  } catch (e) {
    console.error('[institutionVerifyOTPAndResetPassword]', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
