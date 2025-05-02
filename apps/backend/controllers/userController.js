import validator from 'validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // For OTP generation
import pool from '../config/db.js';
import { sendOTP } from '../config/emailService.js'; // Email service for OTPs
import admin from '../config/firebaseAdmin.js'; // Firebase Admin SDK initialization

// Helper function to create JWT token
const createToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });

/** --------------------
 *  User Login
 -------------------- */
export const loginUser = async (req, res) => {
  try {
    console.log('🔹 Received login request:', req.body);
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      console.warn('⚠️ Missing email or password.');
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    console.log(`🔍 Searching for user with email: ${email.trim()}`);
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.trim()],
    );
    console.log('🔹 Database query result:', userResult.rows);

    if (userResult.rows.length === 0) {
      console.warn(`⚠️ User not found: ${email.trim()}`);
      return res.status(401).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    console.log('✅ Found user:', {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    if (!user.password) {
      console.warn(
        '⚠️ User registered with Google, password login not allowed.',
      );
      return res.status(400).json({
        message:
          'Log in with Google as this account was registered using Google.',
      });
    }

    console.log('🔐 Verifying password...');
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn('⚠️ Invalid password for user:', user.email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Password verified. Generating JWT token...');
    const token = createToken(user.id);
    console.log('🔑 Generated token:', token);
    res.json({ success: true, token });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/** --------------------
  *  User Registration (POST /api/auth/register)
  -------------------- */
export const registerUser = async (req, res) => {
  try {
    // For students, expect additional profile fields.
    const { name, email, password, role, age, languages, ageGroup } = req.body;

    if (!name || !email?.trim() || !password || !role) {
      return res
        .status(400)
        .json({ message: 'All fields are required, including role' });
    }

    if (!validator.isEmail(email.trim())) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' });
    }

    const allowedRoles = ['student', 'tutor'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selected' });
    }

    // If the user is a student, ensure the minimal profile fields are provided.
    if (role === 'student') {
      if (!age || !languages || !ageGroup) {
        return res.status(400).json({
          message:
            'For students, age, languages, and ageGroup are required for profile creation.',
        });
      }
    }

    // Check if user already exists.
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.trim()],
    );
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Create user account.
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email.trim(), hashedPassword, role],
    );
    const userId = userResult.rows[0].id;

    // Create a minimal profile for students only.
    if (role === 'student') {
      await pool.query(
        `INSERT INTO profiles (user_id, role, name, age, languages, age_group)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        // Wrap ageGroup in an array to satisfy PostgreSQL array literal format
        [userId, role, name, age, languages, [ageGroup]],
      );
    }

    // Create token after successful registration (and profile creation for students).
    const token = createToken(userId);
    res.status(201).json({ token });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/** --------------------
 *  Get User Profile (GET /api/auth/me)
 -------------------- */
export const getUser = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('getUser - Fetching user with ID:', userId);

    // Optionally validate the userId if necessary. For example, if your IDs are numeric:
    if (isNaN(Number(userId))) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid user ID.' });
    }

    const userResult = await pool.query(
      'SELECT id, email, tokens, role FROM users WHERE id = $1',
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found.' });
    }

    const user = userResult.rows[0];
    res.status(200).json({
      success: true,
      userId: user.id,
      email: user.email,
      tokens: user.tokens || 0, // Default to 0 if tokens is undefined
      role: user.role,
    });
  } catch (error) {
    console.error('getUser Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/** --------------------
 *  Request Password Reset (POST /api/auth/request-reset)
 -------------------- */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.trim()],
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    await pool.query(
      "UPDATE users SET reset_otp = $1, otp_expiry = NOW() + INTERVAL '10 minutes' WHERE email = $2",
      [otp, email.trim()],
    );
    await sendOTP(email, otp);
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Password Reset Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/** --------------------
 *  Verify OTP and Reset Password
 -------------------- */
export const verifyOTPAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email?.trim() || !otp?.trim() || !newPassword?.trim()) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const userResult = await pool.query(
      'SELECT id, reset_otp, otp_expiry FROM users WHERE email = $1',
      [email.trim()],
    );
    if (userResult.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const user = userResult.rows[0];
    if (user.reset_otp !== otp || new Date(user.otp_expiry) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await pool.query(
      'UPDATE users SET password = $1, reset_otp = NULL, otp_expiry = NULL WHERE email = $2',
      [hashedPassword, email.trim()],
    );
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/** --------------------
 *  Google Login (POST /api/auth/google)
 -------------------- */
// Updated to use Firebase Admin SDK for token verification
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ success: false, message: 'Token missing' });

    // Verify the Firebase ID token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email, name } = decodedToken;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Firebase token' });

    // Check if user already exists
    let userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email],
    );
    let user;
    if (userResult.rows.length === 0) {
      // Create new user if not found
      userResult = await pool.query(
        'INSERT INTO users (name, email, google_id) VALUES ($1, $2, $3) RETURNING id, email',
        [name, email, uid],
      );
      user = userResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Create JWT using user's id for session management
    const jwtToken = createToken(user.id);
    res.status(200).json({ success: true, token: jwtToken });
  } catch (error) {
    console.error('Google Login Error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Google authentication failed' });
  }
};

/** --------------------
 *  Update User Role (PATCH /api/auth/update-role)
 -------------------- */
export const updateUserRole = async (req, res) => {
  try {
    // Ensure the user is authenticated (assumes req.user is set by your middleware)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { role, age, languages, ageGroup } = req.body;
    if (!role) {
      return res
        .status(400)
        .json({ success: false, message: 'Role is required' });
    }

    // Validate the role against a list of allowed roles.
    const allowedRoles = ['student', 'tutor'];
    if (!allowedRoles.includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid role selected' });
    }

    // Update the user's role in the database and return the updated user details.
    const updateResult = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, tokens, role, name',
      [role, req.user.id],
    );

    if (updateResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    // If the role is student, check if a minimal profile exists; if not, create one.
    if (role === 'student') {
      const profileCheck = await pool.query(
        'SELECT id FROM profiles WHERE user_id = $1',
        [req.user.id],
      );
      if (profileCheck.rows.length === 0) {
        // For student minimal profile creation, ensure required fields are provided.
        if (!age || !languages || !ageGroup) {
          return res.status(400).json({
            success: false,
            message:
              'For students, age, languages, and ageGroup are required for minimal profile creation.',
          });
        }
        await pool.query(
          `INSERT INTO profiles (user_id, role, name, age, languages, age_group)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id,
            role,
            updateResult.rows[0].name,
            age,
            languages,
            [ageGroup],
          ],
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      user: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Update Role Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error, please try again later',
    });
  }
};

/** --------------------
 *  Admin Login (POST /api/auth/admin-login)
 -------------------- */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    // Check if email and password match the .env admin credentials
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign({ email, role: 'admin' }, process.env.JWT_SECRET, {
        expiresIn: '1d',
      });
      return res.json({ token, message: 'Admin login successful' });
    }

    // Check in the database for admin credentials
    const adminResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND role = $2',
      [email, 'admin'],
    );
    if (adminResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const adminUser = adminResult.rows[0];
    // Verify password (if stored in DB)
    const isMatch = await bcrypt.compare(password, adminUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
    );
    res.json({ token, message: 'Admin login successful' });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
};
