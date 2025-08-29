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
    const userId = req.user?.id;
    if (!userId || isNaN(Number(userId))) {
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
    const { token, name: preferredName } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token missing' });
    }

    // Decode payload (unsafe decode is fine just to route verification)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, message: 'Malformed token' });
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    const iss = payload?.iss;
    const aud = payload?.aud;

    // Acceptable Firebase project IDs (audience) for Firebase ID tokens
    const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'mytutorapp-d3c91';
    const validAudiences = new Set([PROJECT_ID]);

    let email, googleId, displayName;

    if (typeof iss === 'string' && iss.startsWith('https://securetoken.google.com/')) {
      // 🔐 Firebase ID token path
      if (!validAudiences.has(aud)) {
        return res.status(401).json({ success: false, message: 'Token audience mismatch' });
      }

      const decoded = await admin.auth().verifyIdToken(token); // throws if invalid
      email = decoded.email;
      googleId = decoded.uid; // Firebase UID
      displayName = (preferredName || decoded.name || email || '').toString().trim().slice(0, 80);

    } else if (iss === 'https://accounts.google.com' || iss === 'accounts.google.com') {
      // 🔐 Google ID token path
      const clientIds = [
        process.env.GOOGLE_CLIENT_ID_WEB,
        process.env.GOOGLE_CLIENT_ID_ANDROID,
        process.env.GOOGLE_CLIENT_ID_IOS,
      ].filter(Boolean);

      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: clientIds, // one or many client IDs
      });
      const g = ticket.getPayload();
      email = g?.email;
      googleId = g?.sub;          // Google subject
      displayName = (preferredName || g?.name || email || '').toString().trim().slice(0, 80);

    } else {
      return res.status(400).json({ success: false, message: 'Unsupported token issuer' });
    }

    if (!email || !googleId) {
      return res.status(400).json({ success: false, message: 'Invalid token claims' });
    }

    // Upsert user
    const existing = await pool.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email]
    );

    let user;
    if (existing.rows.length === 0) {
      const insert = await pool.query(
        'INSERT INTO users (name, email, google_id) VALUES ($1,$2,$3) RETURNING id, email, name',
        [displayName || email, email, googleId]
      );
      user = insert.rows[0];
    } else {
      user = existing.rows[0];
      if (!user.name || !user.name.trim()) {
        const { rows: updated } = await pool.query(
          'UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name',
          [displayName || email, user.id]
        );
        user = updated[0];
      }
    }

    const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json({ success: true, token: jwtToken });

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

    // Fetch current user to know existing name
    const { rows: existingRows } = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );
    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const existingUser = existingRows[0];

    // Only students can (and may need to) set a name here
    let cleanedName = '';
    let finalName = existingUser.name?.trim() || '';

    if (role === 'student') {
      cleanedName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
      if (cleanedName && !validator.isLength(cleanedName, { min: 2, max: 80 })) {
        return res.status(400).json({
          success: false,
          message: 'Name must be 2–80 characters',
        });
      }
      // Require a name for students (either new or already on file)
      if (!cleanedName && !finalName) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for student role',
        });
      }
      finalName = cleanedName || finalName;
    }

    // Update role; update user name ONLY for students (when provided)
    const { rows } = await pool.query(
      `UPDATE users
         SET role = $1,
             name = CASE
                      WHEN $3 <> '' AND $4 = 'student' THEN $3
                      ELSE name
                    END
       WHERE id = $2
       RETURNING id, email, tokens, role, name`,
      [role, userId, cleanedName || '', role]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const updatedUser = rows[0];

    // If student, ensure profile exists and is consistent
    if (role === 'student') {
      const { rows: prof } = await pool.query(
        'SELECT 1 FROM profiles WHERE user_id = $1',
        [userId]
      );

      const langArray = Array.isArray(languages)
        ? languages
        : (typeof languages === 'string' && languages ? [languages] : null);

      if (!prof.length) {
        if (!age || !langArray || !ageGroup) {
          return res.status(400).json({
            success: false,
            message: 'Students need age, languages, ageGroup',
          });
        }
        await pool.query(
          `INSERT INTO profiles (user_id, role, name, age, languages, age_group)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [userId, role, finalName, Number(age), langArray, [ageGroup]]
        );
      } else if (cleanedName) {
        // Sync profile name only if the student provided a new one now
        await pool.query(
          'UPDATE profiles SET name = $2 WHERE user_id = $1',
          [userId, finalName]
        );
      }
    }

    return res.json({
      success: true,
      message:
        role === 'student'
          ? (cleanedName ? 'Role and name updated' : 'Role updated')
          : 'Role updated',
      user: updatedUser,
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
