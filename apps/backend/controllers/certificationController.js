// packages/shared/api/certificationController.js

import uploadToLocal from '../utils/uploadToLocal.js';
import pool from '../config/db.js';

// Tutor submits certification documents using local storage
export const submitCertification = async (req, res) => {
  try {
    const { profileId } = req.params;

    // …existing checks & upload…

    const insertResult = await pool.query(
      `INSERT INTO certifications
         (profile_id, tutor_name, documents, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [profileId, tutor.name, JSON.stringify(documents), 'Pending', new Date()]
    );
    const certification = insertResult.rows[0];

    // Mark profile.certified = false
    await pool.query(
      `UPDATE profiles SET certified = false, updated_at = NOW() WHERE id = $1`,
      [profileId]
    );

    // Fetch the updated flag
    const profileRes = await pool.query(
      `SELECT certified FROM profiles WHERE id = $1`,
      [profileId]
    );
    const certified = profileRes.rows[0].certified;

    res.status(200).json({
      message: 'Certification submitted successfully and is pending verification.',
      certification,
      certified,
    });
  } catch (error) {
    console.error('Error submitting certification:', error);
    res.status(500).json({ message: 'Error submitting certification.', error: error.message });
  }
};

// Admin verifies a tutor’s certification document
export const verifyCertification = async (req, res) => {
  try {
    const { profileId } = req.params;

    // Update the certification record
    const updateResult = await pool.query(
      `UPDATE certifications
         SET status = 'Verified', verified_at = NOW(), updated_at = NOW()
       WHERE profile_id = $1
       RETURNING *`,
      [profileId]
    );
    const certification = updateResult.rows[0];
    if (!certification) {
      return res.status(404).json({ message: 'Certification not found for this profile.' });
    }

    // Mark profile.certified = true
    await pool.query(
      `UPDATE profiles SET certified = true, updated_at = NOW() WHERE id = $1`,
      [profileId]
    );

    // Fetch updated flag
    const profileRes = await pool.query(
      `SELECT certified FROM profiles WHERE id = $1`,
      [profileId]
    );
    const certified = profileRes.rows[0].certified;

    res.status(200).json({
      message: 'Certification verified successfully.',
      certification,
      certified,
    });
  } catch (error) {
    console.error('Error verifying certification:', error);
    res.status(500).json({ message: 'Error verifying certification.', error: error.message });
  }
};

// Get certification status for a tutor, plus their profile.certified flag
export const getCertificationStatus = async (req, res) => {
  try {
    const { profileId } = req.params;

    // Join certifications and profiles to get both pieces of info
    const result = await pool.query(
      `SELECT c.*, p.certified
         FROM certifications c
         JOIN profiles p ON p.id = c.profile_id
        WHERE c.profile_id = $1`,
      [profileId]
    );
    const row = result.rows[0];
    if (!row) {
      return res
        .status(404)
        .json({ message: 'Certification not found for this profile.' });
    }

    // Separate the certified flag from the rest
    const { certified, ...certification } = row;

    res.status(200).json({
      certification,
      certified,           // <-- new boolean flag
    });
  } catch (error) {
    console.error('Error fetching certification status:', error);
    res.status(500).json({ message: 'Error fetching certification status.', error: error.message });
  }
};
