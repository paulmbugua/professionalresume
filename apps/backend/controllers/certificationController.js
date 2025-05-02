import uploadToLocal from '../utils/uploadToLocal.js';
import pool from '../config/db.js';

// Tutor submits certification documents using local storage
export const submitCertification = async (req, res) => {
  try {
    const { profileId } = req.params;
    console.log('Submitting certification for profileId:', profileId);
    console.log('req.files:', req.files);

    // Check if a certification already exists for this profile.
    const existingCertResult = await pool.query(
      'SELECT * FROM certifications WHERE profile_id = $1',
      [profileId],
    );
    const existingCert = existingCertResult.rows[0];
    if (
      existingCert &&
      (existingCert.status === 'Pending' || existingCert.status === 'Verified')
    ) {
      return res.status(400).json({
        message: 'Certification already submitted and is pending verification.',
      });
    }

    // Ensure files were uploaded.
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ message: 'No certification documents uploaded.' });
    }

    // Upload files to local storage
    const uploadResults = await uploadToLocal(req.files);
    console.log('Upload results:', uploadResults);

    // Define the documents variable from upload results
    const documents = uploadResults.map((result) => ({
      fileUrl: result.url,
      fileName: result.fileName, // ensure your uploadToLocal returns 'fileName'
    }));

    // Retrieve tutor details from the profiles table.
    const tutorResult = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [profileId],
    );
    if (tutorResult.rowCount === 0) {
      return res.status(404).json({ message: 'Tutor profile not found.' });
    }
    const tutor = tutorResult.rows[0];

    // Create a new certification record.
    const insertResult = await pool.query(
      `INSERT INTO certifications (profile_id, tutor_name, documents, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [profileId, tutor.name, JSON.stringify(documents), 'Pending', new Date()],
    );
    const certification = insertResult.rows[0];

    // Optionally update the tutor's profile to mark certification as pending.
    await pool.query('UPDATE profiles SET certified = false WHERE id = $1', [
      profileId,
    ]);

    res.status(200).json({
      message:
        'Certification submitted successfully and is pending verification.',
      certification,
    });
  } catch (error) {
    console.error('Error submitting certification:', error.toString());
    res.status(500).json({
      message: 'Error submitting certification.',
      error: error.message || error.toString(),
    });
  }
};

// Admin verifies a tutor's certification document
export const verifyCertification = async (req, res) => {
  try {
    const { profileId } = req.params;

    // Update the certification record for the profile.
    const updateResult = await pool.query(
      `UPDATE certifications
       SET status = 'Verified', verified_at = NOW()
       WHERE profile_id = $1
       RETURNING *`,
      [profileId],
    );
    const certification = updateResult.rows[0];
    if (!certification) {
      return res
        .status(404)
        .json({ message: 'Certification not found for this profile.' });
    }

    // Update the related profile to indicate that the tutor is certified.
    await pool.query('UPDATE profiles SET certified = true WHERE id = $1', [
      profileId,
    ]);

    res.status(200).json({
      message: 'Certification verified successfully.',
      certification,
    });
  } catch (error) {
    console.error('Error verifying certification:', error.message);
    res.status(500).json({
      message: 'Error verifying certification.',
      error: error.message,
    });
  }
};

// Get certification status for a tutor
export const getCertificationStatus = async (req, res) => {
  try {
    const { profileId } = req.params;
    const certResult = await pool.query(
      'SELECT * FROM certifications WHERE profile_id = $1',
      [profileId],
    );
    const certification = certResult.rows[0];
    if (!certification) {
      return res
        .status(404)
        .json({ message: 'Certification not found for this profile.' });
    }
    res.status(200).json({ certification });
  } catch (error) {
    console.error('Error fetching certification status:', error.message);
    res.status(500).json({
      message: 'Error fetching certification status.',
      error: error.message,
    });
  }
};
