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
    const { name, email, password, role, age, languages, ageGroup } = req.body;
    if (!name || !email?.trim() || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: 'Name, email, password and role are required' });
    }
    if (!validator.isEmail(email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: 'Password must be at least 8 characters' });
    }
    if (!['student', 'tutor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (role === 'student' && (!age || !languages || !ageGroup)) {
      return res.status(400).json({
        success: false,
        message: 'Students must provide age, languages and ageGroup',
      });
    }

    const exists = await pool.query('SELECT 1 FROM users WHERE email = $1', [email.trim()]);
    if (exists.rows.length) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const insertUser = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id',
      [name, email.trim(), hashed, role]
    );
    const userId = insertUser.rows[0].id;

    if (role === 'student') {
      await pool.query(
        `INSERT INTO profiles (user_id, role, name, age, languages, age_group)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [userId, role, name, age, languages, [ageGroup]]
      );
    }

    const token = createToken(userId);
    return res
      .status(201)
      .json({ success: true, token, message: 'Sign up successful' });

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

    // ✅ Handle admin token form: id === "admin:<email>"
    if (typeof rawId === 'string' && rawId.startsWith('admin:')) {
      const email = rawId.slice(6);
      return res.json({
        success: true,
        userId: null,       // no numeric DB user
        email,
        tokens: 0,
        role: 'admin',      // this allows your ShopContext/guards to pass
      });
    }

    // ✅ Regular numeric user
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, tokens, role FROM users WHERE id = $1',
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const u = rows[0];
    return res.json({
      success: true,
      userId: u.id,
      email: u.email,
      tokens: u.tokens || 0,
      role: u.role,
    });
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
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.trim()]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    await pool.query(
      "UPDATE users SET reset_otp = $1, otp_expiry = NOW() + INTERVAL '10 minutes' WHERE email = $2",
      [otp, email.trim()]
    );
    await sendOTP(email.trim(), otp);
    return res.json({ success: true, message: 'OTP sent' });

  } catch (err) {
    console.error('requestPasswordReset Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const { rows } = await pool.query(
      'SELECT reset_otp, otp_expiry FROM users WHERE email = $1',
      [email.trim()]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    if (user.reset_otp !== otp || new Date(user.otp_expiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const hash = await bcrypt.hash(newPassword.trim(), 10);
    await pool.query(
      `UPDATE users SET password = $1, reset_otp = NULL, otp_expiry = NULL WHERE email = $2`,
      [hash, email.trim()]
    );
    return res.json({ success: true, message: 'Password updated' });

  } catch (err) {
    console.error('verifyOTP Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
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
      INSERT INTO users (name, email, google_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE
      SET
        name      = CASE WHEN COALESCE(users.name, '') = '' THEN EXCLUDED.name ELSE users.name END,
        google_id = COALESCE(users.google_id, EXCLUDED.google_id)
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
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { role, age, languages, ageGroup, name } = req.body;
    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }
    if (!['student', 'tutor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Load current user (for existing name, etc.)
    const { rows: existingRows } = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const existingUser = existingRows[0];

    // Normalize inputs
    const cleanName =
      typeof name === 'string' ? name.trim().slice(0, 80) : '';
    const langArray = Array.isArray(languages)
      ? languages
      : (typeof languages === 'string' && languages ? [languages] : null);

    // Student must have minimal profile data
    if (role === 'student') {
      if (!cleanName && !(existingUser.name && existingUser.name.trim().length >= 2)) {
        return res.status(400).json({ success: false, message: 'Name is required for student role' });
      }
      if (!age || !langArray || !ageGroup) {
        return res.status(400).json({
          success: false,
          message: 'Students need age, languages, and ageGroup',
        });
      }
    }

    // Update user (set role, and for students update name if provided)
    const { rows } = await pool.query(
      `
      UPDATE users
         SET role = $1,
             name = CASE
                      WHEN $4 = 'student' AND $3 <> '' THEN $3
                      ELSE name
                    END
       WHERE id = $2
       RETURNING id, email, tokens, role, name
      `,
      [role, userId, cleanName || '', role]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const updatedUser = rows[0];

    // Maintain a profile row for students
    let profileData = null;
    if (role === 'student') {
      const { rows: prof } = await pool.query(
        'SELECT age, languages, age_group FROM profiles WHERE user_id = $1',
        [userId]
      );

      if (!prof.length) {
        await pool.query(
          `INSERT INTO profiles (user_id, role, name, age, languages, age_group)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            userId,
            role,
            cleanName || updatedUser.name || '',
            Number(age),
            langArray,
            [ageGroup],
          ]
        );
        profileData = { age: Number(age), languages: langArray, age_group: [ageGroup] };
      } else {
        // If name provided now, sync it
        if (cleanName) {
          await pool.query('UPDATE profiles SET name = $2 WHERE user_id = $1', [
            userId,
            cleanName,
          ]);
        }
        // (Optionally, you could upsert age/languages/age_group here too.)
        profileData = prof[0];
      }
    }

    return res.json({
      success: true,
      message:
        role === 'student'
          ? (cleanName ? 'Role and name updated' : 'Role updated')
          : 'Role updated',
      role: updatedUser.role,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        tokens: updatedUser.tokens || 0,
        ...(profileData ? profileData : {}),
      },
    });
  } catch (err) {
    console.error('updateUserRole Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const deleteUser = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // 1) Delete their profile first
    await client.query(
      'DELETE FROM profiles WHERE user_id = $1',
      [userId]
    );

    // 2) Then delete the user record
    await client.query(
      'DELETE FROM users WHERE id = $1',
      [userId]
    );

    // Commit
    await client.query('COMMIT');
    return res.sendStatus(204);
  } catch (err) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error deleting user & profile:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to delete account' });
  } finally {
    client.release();
  }
};


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
