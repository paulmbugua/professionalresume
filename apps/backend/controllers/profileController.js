// Imports and utilities
import uploadToLocal from '../utils/uploadToLocal.js';
import deleteLocalFile from '../utils/deleteLocalFile.js';
import pool from '../config/db.js';
import {
  profileValidationSchema,
  profileUpdateValidationSchema,
} from '../validators/profileValidators.js';

// 1. Create Profile (PostgreSQL)
export const createProfile = async (req, res) => {
  try {
    const {
      role,
      name,
      age,
      paymentMethod,
      bankAccount,
      bankCode,
      mpesaPhoneNumber,
    } = req.body;

    // Trim category and handle optional field.
    const category = req.body.category?.trim() || null;

    // Handle file uploads for images.
    const images = ['image1', 'image2', 'image3', 'image4']
      .map((key) => req.files?.[key]?.[0])
      .filter(Boolean);

    // For tutors, upload images and optional video using local storage.
    const galleryUploads = role === 'tutor' ? await uploadToLocal(images) : [];
    const gallery =
      role === 'tutor' ? galleryUploads.map((img) => img.url) : null;
    const videoUrl =
      role === 'tutor' && req.files?.video?.[0]
        ? (await uploadToLocal([req.files.video[0]]))[0].url
        : null;

    // Prepare description and pricing for tutors.
    const description =
      role === 'tutor'
        ? {
            bio: req.body['description.bio'],
            expertise: JSON.parse(req.body['description.expertise'] || '[]'),
            teachingStyle: JSON.parse(
              req.body['description.teachingStyle'] || '[]',
            ),
          }
        : null;
    const pricing =
      role === 'tutor' ? JSON.parse(req.body.pricing || '{}') : null;

    // Parse languages (common to both roles) and age group (for students)
    const languages = JSON.parse(req.body.languages || '[]');
    const ageGroup =
      role === 'student' ? JSON.parse(req.body.ageGroup || '[]') : null;

    // Payment details (only for tutors)
    // Here we store each field separately.
    const payment_method = role === 'tutor' ? paymentMethod : null;
    const bank_account =
      role === 'tutor' && paymentMethod === 'bank' ? bankAccount : null;
    const bank_code =
      role === 'tutor' && paymentMethod === 'bank' ? bankCode : null;
    const mpesa_phone_number =
      role === 'tutor' && paymentMethod === 'mpesa' ? mpesaPhoneNumber : null;

    // Validate data using your Joi schema.
    // Build the base payload with common fields
    const payload = {
      role,
      name,
      age: parseInt(age, 10),
      languages,
    };

    // Include tutor-only fields only if role is 'tutor'
    if (role === 'tutor') {
      payload.category = category;
      payload.description = description;
      payload.pricing = pricing;
      payload.gallery = gallery;
      payload.paymentMethod = paymentMethod;
      payload.bankAccount = bankAccount;
      payload.bankCode = bankCode;
      payload.mpesaPhoneNumber = mpesaPhoneNumber;
    }

    // Include student-only fields only if role is 'student'
    if (role === 'student') {
      payload.ageGroup = ageGroup;
    }

    // Validate the payload with your schema
    const { error } = profileValidationSchema.validate(payload);
    if (error) {
      console.error('Validation Error:', error.details);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    // Prepare profile data for insertion.
    // Adjust the column names to match your PostgreSQL schema.
    const insertQuery = `
      INSERT INTO profiles (
        user_id,
        role,
        name,
        age,
        category,
        description,
        pricing,
        languages,
        gallery,
        video,
        age_group,
        payment_method,
        bank_account,
        bank_code,
        mpesa_phone_number
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *;
    `;
    const params = [
      req.user.id, // user_id (assumes req.user.id is set)
      role,
      name,
      parseInt(age, 10),
      category,
      description, // stored as JSON (ensure your column is JSONB)
      pricing, // stored as JSON
      languages, // stored as JSON
      gallery, // stored as JSON (an array of URLs)
      videoUrl,
      ageGroup, // stored as JSON
      payment_method,
      bank_account,
      bank_code,
      mpesa_phone_number,
    ];

    const result = await pool.query(insertQuery, params);
    const profile = result.rows[0];

    res.status(201).json({ success: true, profile });
  } catch (error) {
    console.error('Error in createProfile:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create profile.',
      error: error.message,
    });
  }
};

export const createProfileJson = async (req, res) => {
  try {
    const payload = req.body
    // Validate payload – same schema you use in multipart
    const { error } = profileValidationSchema.validate(payload)
    if (error) {
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message })
    }
    // Build INSERT just like your existing createProfile, but
    // using payload.gallery (array of URLs) and payload.video (URL)
    const {
      role, name, age, languages,
      ageGroup, category, description,
      pricing, paymentMethod, bankAccount,
      bankCode, mpesaPhoneNumber, gallery, video
    } = payload

    const insertQuery = `
      INSERT INTO profiles (
        user_id, role, name, age, languages,
        age_group, category, description, pricing,
        payment_method, bank_account, bank_code,
        mpesa_phone_number, gallery, video
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15
      ) RETURNING *;
    `
    const params = [
      req.user.id,
      role,
      name,
      age,
      languages,
      role === 'student' ? ageGroup : null,
      role === 'tutor' ? category : null,
      role === 'tutor' ? description : null,
      role === 'tutor' ? pricing : null,
      role === 'tutor' ? paymentMethod : null,
      role === 'tutor' ? bankAccount : null,
      role === 'tutor' ? bankCode : null,
      role === 'tutor' ? mpesaPhoneNumber : null,
      role === 'tutor' ? gallery : null,
      role === 'tutor' ? video : null,
    ]

    const result = await pool.query(insertQuery, params)
    res.status(201).json({ success: true, profile: result.rows[0] })
  } catch (err) {
    console.error('Error in createProfileJson:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ✅ **Update Profile in PostgreSQL**
export const updateProfile = async (req, res) => {
  console.log('Received data on backend:', req.body);
  try {
    // Destructure fields from req.body.
    const {
      name,
      age: ageStr,
      status,
      category,
      pricing,
      languages,
      experienceLevel,
      recommended,
      ageGroup,
      paymentMethod,
      bankAccount,
      bankCode,
      mpesaPhoneNumber,
    } = req.body;

    // Fetch existing profile
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (profileResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Profile not found.' });
    }
    const profile = profileResult.rows[0];
    const normalizedRole = (profile.role || '').toLowerCase();

    // Parse simple fields
    const age = parseInt(ageStr, 10);
    const parsedLanguages = Array.isArray(languages) ? languages : [];
    const parsedAgeGroup = Array.isArray(ageGroup) ? ageGroup : [];

    // Pricing & recommended only for tutors
    const parsedPricing =
      normalizedRole === 'tutor' && typeof pricing === 'object'
        ? pricing
        : null;
    const parsedRecommended =
      normalizedRole === 'tutor' && Array.isArray(recommended)
        ? recommended
        : [];

    // Build description for tutors
    let description = null;
    if (normalizedRole === 'tutor') {
      const desc = req.body.description || {};
      description = {
        bio: desc.bio ?? profile.description?.bio ?? '',
        expertise: Array.isArray(desc.expertise)
          ? desc.expertise
          : profile.description?.expertise || [],
        teachingStyle: Array.isArray(desc.teachingStyle)
          ? desc.teachingStyle
          : profile.description?.teachingStyle || [],
      };
    }

    // Prepare object for Joi validation
    const validationData = {
      role: normalizedRole,
      name,
      age,
      languages: parsedLanguages,
      ageGroup: parsedAgeGroup,
      ...(normalizedRole === 'tutor' && { category }),
      ...(normalizedRole === 'tutor' && { pricing: parsedPricing }),
      ...(normalizedRole === 'tutor' && { recommended: parsedRecommended }),
      ...(normalizedRole === 'tutor' && { experienceLevel }),
      ...(normalizedRole === 'tutor' && { description }),
      ...(normalizedRole === 'tutor' && {
        paymentMethod,
        bankAccount,
        bankCode,
        mpesaPhoneNumber,
        status,
      }),
      ...(normalizedRole === 'tutor' && { gallery: profile.gallery || [] }),
    };

    // Validate
    const { error, value } = profileUpdateValidationSchema.validate(
      validationData,
      { stripUnknown: true }
    );
    if (error) {
      console.error('Validation Error:', error.details);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    // Map to DB columns
    const updatedData = {
      name: value.name || profile.name,
      age: value.age || profile.age,
      languages: value.languages || profile.languages,
      age_group: value.ageGroup || profile.age_group,
      category:
        normalizedRole === 'tutor'
          ? value.category || profile.category
          : profile.category,
      description:
        normalizedRole === 'tutor'
          ? JSON.stringify(value.description)
          : profile.description,
      pricing:
        normalizedRole === 'tutor'
          ? JSON.stringify(value.pricing)
          : profile.pricing,
      experience_level:
        normalizedRole === 'tutor'
          ? value.experienceLevel
          : profile.experience_level,
      status:
        normalizedRole === 'tutor' ? value.status : profile.status,
      recommended:
        normalizedRole === 'tutor'
          ? value.recommended
          : profile.recommended,
      payment_method:
        normalizedRole === 'tutor'
          ? value.paymentMethod
          : profile.payment_method,
      bank_account:
        normalizedRole === 'tutor' && value.paymentMethod === 'bank'
          ? value.bankAccount
          : profile.bank_account,
      bank_code:
        normalizedRole === 'tutor' && value.paymentMethod === 'bank'
          ? value.bankCode
          : profile.bank_code,
      mpesa_phone_number:
        normalizedRole === 'tutor' && value.paymentMethod === 'mpesa'
          ? value.mpesaPhoneNumber
          : profile.mpesa_phone_number,
      gallery: profile.gallery,
      video: profile.video,
    };

    // Handle any image/video uploads (if req.files present)
    const fileFields = ['image1', 'image2', 'image3', 'image4'];
    const images = fileFields
      .map(key => req.files?.[key]?.[0])
      .filter(Boolean);
    if (images.length) {
      const uploaded = await uploadToLocal(images);
      updatedData.gallery = uploaded.map(img => img.url);
    }
    if (normalizedRole === 'tutor' && req.files?.video?.[0]) {
      const videoUploaded = await uploadToLocal([req.files.video[0]]);
      updatedData.video = videoUploaded[0]?.url || updatedData.video;
    }

    console.log('Saving updated profile with data:', updatedData);

    // Update DB
    const updateQuery = `
      UPDATE profiles SET
        name = $1,
        age = $2,
        languages = $3,
        age_group = $4,
        category = $5,
        description = $6,
        pricing = $7,
        experience_level = $8,
        status = $9,
        recommended = $10,
        payment_method = $11,
        bank_account = $12,
        bank_code = $13,
        mpesa_phone_number = $14,
        gallery = $15,
        video = $16
      WHERE user_id = $17
      RETURNING *;
    `;
    const params = [
      updatedData.name,
      updatedData.age,
      updatedData.languages,
      updatedData.age_group,
      updatedData.category,
      updatedData.description,
      updatedData.pricing,
      updatedData.experience_level,
      updatedData.status,
      updatedData.recommended,
      updatedData.payment_method,
      updatedData.bank_account,
      updatedData.bank_code,
      updatedData.mpesa_phone_number,
      updatedData.gallery,
      updatedData.video,
      req.user.id,
    ];

    const result = await pool.query(updateQuery, params);
    res.status(200).json({ success: true, profile: result.rows[0] });
  } catch (err) {
    console.error('Error in updateProfile:', err);
    res
      .status(500)
      .json({ message: 'Failed to update profile.', error: err.message });
  }
};

// 3. Get User Profile
export const getUserProfile = async (req, res) => {
  try {
    // Query the profiles table for a profile matching the user ID.
    const result = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.id],
    );

    // If no profile is found, return an object with profileExists: false and an empty gallery.
    if (result.rows.length === 0) {
      return res
        .status(200)
        .json({ profileExists: false, profile: { gallery: [] } });
    }

    const profile = result.rows[0];

    // Ensure gallery is always an array. (Assumes the gallery column is stored as JSON/JSONB.)
    const safeProfile = {
      ...profile,
      gallery: Array.isArray(profile.gallery) ? profile.gallery : [],
    };

    res.status(200).json({ profileExists: true, profile: safeProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

// 4. Toggle Notifications
export const toggleNotifications = async (req, res) => {
  try {
    // Retrieve the current notifications value for the profile
    const result = await pool.query(
      'SELECT notifications FROM profiles WHERE user_id = $1',
      [req.user.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found.' });
    }

    const currentNotifications = result.rows[0].notifications;
    const newNotifications = !currentNotifications;

    // Update the notifications field and return the updated profile
    const updateResult = await pool.query(
      'UPDATE profiles SET notifications = $1 WHERE user_id = $2 RETURNING *',
      [newNotifications, req.user.id],
    );
    const updatedProfile = updateResult.rows[0];

    res.json({
      success: true,
      message: 'Notifications toggled successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Toggle Notifications Error:', error);
    res.status(500).json({ message: 'Failed to toggle notifications.' });
  }
};

// 5. Add Recent Chat Interaction
export const addRecentChat = async (req, res) => {
  try {
    // Update the recent chats count by incrementing it by 1.
    const updateResult = await pool.query(
      `UPDATE profiles 
       SET recent_chats_count = recent_chats_count + 1 
       WHERE id = $1 
       RETURNING *`,
      [req.params.id],
    );

    if (updateResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Profile not found.' });
    }

    const updatedProfile = updateResult.rows[0];
    res.status(200).json({
      success: true,
      message: 'Added to recent chats',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Error in addRecentChat:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to update recent chats' });
  }
};

// 6. Update Profile Rating
export const updateRating = async (req, res) => {
  try {
    const { rating } = req.body;
    // Ensure the rating is a number.
    const numericRating = parseFloat(rating);
    if (isNaN(numericRating)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid rating value.' });
    }

    // Update the rating_total and rating_count in one query.
    const updateResult = await pool.query(
      `UPDATE profiles 
       SET rating_total = rating_total + $1, 
           rating_count = rating_count + 1 
       WHERE id = $2 
       RETURNING *`,
      [numericRating, req.params.id],
    );

    if (updateResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Profile not found.' });
    }

    const updatedProfile = updateResult.rows[0];
    res.status(200).json({
      success: true,
      message: 'Rating updated',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Error in updateRating:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to update rating' });
  }
};

// 7. Get Profile (with filters)
export const getProfile = async (req, res) => {
  const {
    status,
    experienceLevel,
    expertise,
    teachingStyle,
    ageGroup,
    languageFluency,
    pricing,
    category,
    attribute,
  } = req.query;

  try {
    let conditions = [];
    let values = [];
    let idx = 1;

    // Filter by experience level.
    if (experienceLevel) {
      conditions.push(`experience_level = $${idx}`);
      values.push(experienceLevel);
      idx++;
    }

    // Filter by teaching style (assumes description is stored as JSONB).
    if (teachingStyle) {
      const styles = teachingStyle.split(',').map((s) => s.trim());
      conditions.push(`(description->'teachingStyle') ?| $${idx}`);
      values.push(styles);
      idx++;
    }

    // Filter by expertise.
    if (expertise) {
      const expertiseArr = expertise.split(',').map((s) => s.trim());
      conditions.push(`(description->'expertise') ?| $${idx}`);
      values.push(expertiseArr);
      idx++;
    }

    // Filter by age group (assumes age_group is stored as JSONB array).
    if (ageGroup) {
      const ageGroupArr = ageGroup.split(',').map((s) => s.trim());
      conditions.push(`age_group ?| $${idx}`);
      values.push(ageGroupArr);
      idx++;
    }

    // Filter by language fluency.
    if (languageFluency) {
      conditions.push(`language_fluency = $${idx}`);
      values.push(languageFluency);
      idx++;
    }

    // Filter by pricing range.
    if (pricing) {
      const [min, max] = pricing.split('-').map(Number);
      conditions.push(`(
        ((pricing->>'privateSession')::numeric BETWEEN $${idx} AND $${
          idx + 1
        }) OR
        ((pricing->>'groupSession')::numeric BETWEEN $${idx} AND $${idx + 1}) OR
        ((pricing->>'lecture')::numeric BETWEEN $${idx} AND $${idx + 1}) OR
        ((pricing->>'workshop')::numeric BETWEEN $${idx} AND $${idx + 1})
      )`);
      values.push(min, max);
      idx += 2;
    }

    // Filter by category.
    if (category) {
      conditions.push(`category = $${idx}`);
      values.push(category);
      idx++;
    }

    // Filter by additional attributes.
    if (attribute) {
      conditions.push(`attributes = $${idx}`);
      values.push(attribute);
      idx++;
    }

    // Filter by status.
    if (status) {
      conditions.push(`status = $${idx}`);
      values.push(status);
      idx++;
    }

    // Build the query. If conditions exist, use them; otherwise, default ordering.
    let query = '';
    if (conditions.length > 0) {
      query = `SELECT * FROM profiles WHERE ${conditions.join(' AND ')}
               ORDER BY id DESC
               LIMIT 20`;
    } else {
      query = `SELECT * FROM profiles
               ORDER BY id DESC
               LIMIT 20`;
    }

    // Log the final query for debugging.
    console.log('Final query:', query, 'with values:', values);

    const result = await pool.query(query, values);
    res.status(200).json({ success: true, profiles: result.rows });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profiles',
      error: error.message,
    });
  }
};

// 8. Get Profile by ID
export const getProfileById = async (req, res) => {
  const { id } = req.params;
  console.log('getProfileById: Received id:', id);
  if (!id || isNaN(Number(id))) {
    console.error('getProfileById: Invalid id provided:', id);
    return res.status(400).json({ message: 'Invalid profile id.' });
  }
  try {
    const result = await pool.query('SELECT * FROM profiles WHERE id = $1', [
      id,
    ]);
    if (result.rows.length === 0) {
      console.error('getProfileById: No profile found for id:', id);
      return res.status(404).json({ message: 'Profile not found' });
    }
    console.log('getProfileById: Returning profile:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('getProfileById: Error fetching profile:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

// 9. Remove Profile Item
export const removeProfileItem = async (req, res) => {
  const { id, field } = req.params;
  const { item } = req.body;

  try {
    // Retrieve the profile from the database.
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [id],
    );
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    let profile = profileResult.rows[0];

    if (field === 'gallery') {
      // Remove the file from the local uploads folder using the utility.
      await deleteLocalFile(item);
      // Filter the gallery array (assumed stored as JSON)
      const updatedGallery = (profile.gallery || []).filter(
        (url) => url !== item,
      );
      // Update the gallery field in the database.
      const updateResult = await pool.query(
        'UPDATE profiles SET gallery = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(updatedGallery), id],
      );
      profile = updateResult.rows[0];
    } else if (field === 'video') {
      if (profile.video) {
        await deleteLocalFile(profile.video);
      }
      // Clear the video field.
      const updateResult = await pool.query(
        'UPDATE profiles SET video = $1 WHERE id = $2 RETURNING *',
        ['', id],
      );
      profile = updateResult.rows[0];
    } else {
      // For any other field assumed to be an array (e.g., attributes)
      let currentFieldValue = profile[field];
      if (!Array.isArray(currentFieldValue)) {
        return res.status(400).json({ message: 'Field is not an array' });
      }
      const updatedFieldValue = currentFieldValue.filter(
        (value) => value !== item,
      );
      // Construct a dynamic query to update the given field.
      const query = `UPDATE profiles SET ${field} = $1 WHERE id = $2 RETURNING *`;
      const updateResult = await pool.query(query, [
        JSON.stringify(updatedFieldValue),
        id,
      ]);
      profile = updateResult.rows[0];
    }

    res
      .status(200)
      .json({ message: `${field} item removed successfully`, profile });
  } catch (error) {
    console.error('Error in removeProfileItem:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 10. Upload Single File
export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file provided' });
    }
    const uploadResult = await uploadToLocal([req.file]);
    res.status(200).json({ url: uploadResult[0].url });
  } catch (error) {
    console.error('Error in uploadSingleFile:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
};

// 11. Get Profile with Recommendations
export const getProfileWithRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [id],
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const profile = profileResult.rows[0];

    // Assume "recommended" is stored as an array of profile IDs (e.g., in a JSONB column)
    if (
      profile.recommended &&
      Array.isArray(profile.recommended) &&
      profile.recommended.length
    ) {
      const recResult = await pool.query(
        'SELECT id, name, status, gallery FROM profiles WHERE id = ANY($1)',
        [profile.recommended],
      );
      profile.recommended = recResult.rows;
    } else {
      profile.recommended = [];
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile with recommendations:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
};

// 12. Get Profile by User ID
export const getProfileByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId],
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json(profileResult.rows[0]);
  } catch (error) {
    console.error('Error fetching profile by user ID:', error);
    res.status(500).json({ message: 'Failed to fetch profile by user ID.' });
  }
};

// 13. Get Random Profile
export const getRandomProfile = async (req, res) => {
  try {
    // Count only profiles with role 'tutor'
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM profiles WHERE role = 'tutor'",
    );
    const count = parseInt(countResult.rows[0].count, 10);
    console.log('Total tutor profiles in database:', count);

    if (count === 0) {
      console.log('No tutor profiles found.');
      return res.status(404).json({ message: 'No tutor profiles found' });
    }

    // Generate a random offset within the count
    const randomOffset = Math.floor(Math.random() * count);
    console.log('Random offset generated:', randomOffset);

    // Updated query without selecting non-existent columns
    const randomProfileResult = await pool.query(
      `SELECT id, name, role, gallery, category, description
       FROM profiles
       WHERE role = 'tutor'
       ORDER BY id
       LIMIT 1 OFFSET $1`,
      [randomOffset],
    );

    if (randomProfileResult.rows.length === 0) {
      console.log('No profile found after random selection.');
      return res.status(404).json({ message: 'No profiles found' });
    }

    const randomProfile = randomProfileResult.rows[0];

    // Assuming description is stored as JSON, try to extract expertise and teachingStyle
    let expertise = [];
    let teachingStyle = [];
    if (randomProfile.description) {
      // If the description field is a JSON string, parse it.
      let desc;
      try {
        desc =
          typeof randomProfile.description === 'string'
            ? JSON.parse(randomProfile.description)
            : randomProfile.description;
      } catch (parseError) {
        console.error('Error parsing description JSON:', parseError);
        desc = {};
      }
      expertise = desc.expertise || [];
      teachingStyle = desc.teachingStyle || [];
    }

    res.json({
      id: randomProfile.id,
      name: randomProfile.name,
      role: randomProfile.role,
      gallery: randomProfile.gallery,
      category: randomProfile.category,
      expertise,
      teachingStyle,
    });
  } catch (error) {
    console.error('Error fetching random profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};
