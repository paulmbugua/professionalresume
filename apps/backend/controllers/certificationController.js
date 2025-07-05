// apps/backend/controllers/certificationController.js

import express from 'express';
import uploadToLocal from '../utils/uploadToLocal.js';
import pool from '../config/db.js';

/**
 * POST /api/profiles/:profileId/certification
 * Body: { files: [{ name: string, type: string, base64: string }] }
 */
export const submitCertification = [
  // allow large JSON payloads for base64 files
  express.json({ limit: '50mb' }),
  async (req, res) => {
    try {
      // a) Validate profileId
      const profileId = parseInt(req.params.profileId, 10);
      if (isNaN(profileId)) {
        return res.status(400).json({ message: 'Invalid profileId' });
      }

      // b) Load tutor name from profiles table
      const profileRes = await pool.query(
        'SELECT name FROM profiles WHERE id = $1',
        [profileId]
      );
      if (profileRes.rowCount === 0) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      const { name: tutorName } = profileRes.rows[0];

      // c) Parse & validate JSON files array
      const { files } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ message: 'No files provided' });
      }

      // d) Decode base64 into Buffers and prepare upload inputs
      const uploadInputs = files.map(({ name, base64 }) => {
        if (!name || !base64) {
          throw new Error(`Missing name or base64 in file: ${JSON.stringify({ name, base64 })}`);
        }
        return {
          buffer: Buffer.from(base64, 'base64'),
          originalname: name,
        };
      });

      // e) Upload all files in one shot; uploadToLocal returns [{ url, fileName }, …]
      const savedFiles = await uploadToLocal(uploadInputs);

      // f) Extract only the URL strings
      const documents = savedFiles.map((f) => f.url);

      // g) Insert new certification record
      const insertResult = await pool.query(
        `INSERT INTO certifications
           (profile_id, tutor_name, documents, status, submitted_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          profileId,
          tutorName,
          JSON.stringify(documents),
          'Pending',
          new Date(),
        ]
      );
      const certification = insertResult.rows[0];

      // h) Mark profile.certified = false
      await pool.query(
        `UPDATE profiles
            SET certified = false, updated_at = NOW()
          WHERE id = $1`,
        [profileId]
      );

      // i) Fetch updated certified flag
      const updatedProfile = await pool.query(
        `SELECT certified FROM profiles WHERE id = $1`,
        [profileId]
      );
      const certified = updatedProfile.rows[0].certified;

      // j) Ensure documents is a JS array (it will be parsed from JSONB by pg)
      if (typeof certification.documents === 'string') {
        certification.documents = JSON.parse(certification.documents);
      }

      return res.status(200).json({
        message: 'Certification submitted successfully and is pending verification.',
        certification,
        certified,
      });
    } catch (error) {
      console.error('Error submitting certification:', error);
      return res.status(500).json({
        message: 'Error submitting certification.',
        error: error.message,
      });
    }
  },
];

/**
 * POST /api/profiles/:profileId/certification/verify
 * (No files expected here)
 */
export const verifyCertification = async (req, res) => {
  try {
    const profileId = parseInt(req.params.profileId, 10);
    if (isNaN(profileId)) {
      return res.status(400).json({ message: 'Invalid profileId' });
    }

    // a) Update certification status to Verified
    const updateResult = await pool.query(
      `UPDATE certifications
         SET status = 'Verified',
             verified_at = NOW(),
             updated_at = NOW()
       WHERE profile_id = $1
       RETURNING *`,
      [profileId]
    );
    const certification = updateResult.rows[0];
    if (!certification) {
      return res
        .status(404)
        .json({ message: 'Certification not found for this profile.' });
    }

    // b) Mark profile.certified = true
    await pool.query(
      `UPDATE profiles
          SET certified = true, updated_at = NOW()
        WHERE id = $1`,
      [profileId]
    );

    // c) Fetch updated flag
    const profileRes = await pool.query(
      `SELECT certified FROM profiles WHERE id = $1`,
      [profileId]
    );
    const certified = profileRes.rows[0].certified;

    // d) Ensure documents is a JS array
    if (typeof certification.documents === 'string') {
      certification.documents = JSON.parse(certification.documents);
    }

    return res.status(200).json({
      message: 'Certification verified successfully.',
      certification,
      certified,
    });
  } catch (error) {
    console.error('Error verifying certification:', error);
    return res.status(500).json({
      message: 'Error verifying certification.',
      error: error.message,
    });
  }
};

/**
 * GET /api/profiles/:profileId/certification/status
 */
export const getCertificationStatus = async (req, res) => {
  try {
    const rawParam = req.params.profileId;
    console.log('[certController] Incoming profileId param:', rawParam);

    const param = parseInt(rawParam, 10);
    if (isNaN(param)) {
      console.warn('[certController] Invalid profileId (not a number):', rawParam);
      return res.status(400).json({ message: 'Invalid profileId' });
    }

    // 1) Resolve the real profiles.id (by id OR user_id)
    const profileRes = await pool.query(
      `SELECT id, certified
         FROM profiles
        WHERE id = $1 OR user_id = $1
        LIMIT 1`,
      [param]
    );
    console.log(
      `[certController] Profile lookup rows (${profileRes.rowCount}):`,
      profileRes.rows
    );

    if (profileRes.rowCount === 0) {
      console.warn('[certController] No profile found for param:', param);
      return res
        .status(404)
        .json({ message: 'Profile not found by id or user_id.' });
    }

    const { id: realProfileId, certified } = profileRes.rows[0];
    console.log(
      `[certController] Resolved realProfileId=${realProfileId}, certified flag=${certified}`
    );

    // 2) Fetch the latest certification entry
    const certRes = await pool.query(
      `SELECT c.id,
              c.profile_id,
              c.tutor_name,
              c.documents,
              c.status,
              c.submitted_at,
              c.verified_at
         FROM certifications c
        WHERE c.profile_id = $1
     ORDER BY c.submitted_at DESC
        LIMIT 1`,
      [realProfileId]
    );
    console.log(
      `[certController] Certification lookup rows (${certRes.rowCount}):`,
      certRes.rows
    );

    if (certRes.rowCount === 0) {
      console.info(
        `[certController] No certification record found for profile_id=${realProfileId}`
      );
      return res
        .status(404)
        .json({ message: 'Certification not found for this profile.' });
    }

    const row = certRes.rows[0];
    // 3) Parse documents JSON
    const documents =
      typeof row.documents === 'string'
        ? JSON.parse(row.documents)
        : row.documents;
    console.log(
      `[certController] Parsed documents for certification ${row.id}:`,
      documents
    );

    // 4) Build and return payload
    const certification = {
      id: row.id,
      profile_id: row.profile_id,
      tutor_name: row.tutor_name,
      documents,
      status: row.status,
      submitted_at: row.submitted_at,
      verified_at: row.verified_at,
    };

    console.log(
      `[certController] Sending status response for profile_id=${realProfileId}:`,
      { certification, certified }
    );

    return res.status(200).json({ certification, certified });
  } catch (error) {
    console.error('[certController] Error fetching certification status:', error);
    return res.status(500).json({
      message: 'Error fetching certification status.',
      error: error.message,
    });
  }
};