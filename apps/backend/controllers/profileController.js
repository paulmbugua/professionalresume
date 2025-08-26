// controllers/profileController.js

import { v2 as cloudinary } from 'cloudinary';
import pool from '../config/db.js';
import path from 'path'
import {
  profileValidationSchema,
  profileUpdateValidationSchema,
} from '../validators/profileValidators.js';
import { normalizePayoutFromBody } from '../utils/payout.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Upload local files to Cloudinary.
 * @param {Array} files – each with a `.path` and `.originalname`
 * @param {string} resourceType – 'image' or 'video'
 * @returns {Promise<Array<{ url: string; public_id: string }>>}
 */
async function uploadToCloudinary(files, resourceType = 'image') {
  return Promise.all(files.map(async file => {
    // 1) If Multer gave us a buffer (memoryStorage), use upload_stream:
    if (file.buffer) {
      return new Promise((resolve, reject) => {
        const opts = {
          resource_type: resourceType,
          folder:         'class_vault',
          public_id:      `auto/${Date.now()}_${file.originalname.replace(/\..+$/,'')}`
        }
        const stream = cloudinary.uploader.upload_stream(
          opts,
          (err, result) => {
            if (err) return reject(err)
            resolve({ url: result.secure_url, public_id: result.public_id })
          }
        )
        stream.end(file.buffer)
      })
    }

    // 2) Otherwise fall back to the on‐disk path:
    if (file.path) {
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: resourceType,
        folder:         'class_vault',
        public_id:      `auto/${Date.now()}_${path.basename(file.path, path.extname(file.path))}`
      })
      return { url: result.secure_url, public_id: result.public_id }
    }

    throw new Error('No file.buffer or file.path provided')
  }))
}

/**
 * Delete one or more public_ids from Cloudinary.
 * @param {string[]} publicIds
 */
const deleteFromCloudinary = async publicIds => {
  try {
    await cloudinary.api.delete_resources(publicIds, { resource_type: 'image' });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
};

/**
 * Given a Cloudinary URL, extract the public_id with path (no extension).
 * E.g. 'https://res.cloudinary.com/…/upload/v123/profiles/abc.jpg'
 * → 'profiles/abc'
 */
const getPublicIdFromUrl = url => {
  const [, afterUpload] = url.split('/upload/');
  return afterUpload.replace(/\.[^/.]+$/, '');
};

// ─── 1. Create Profile (multipart/form-data) ─────────────────────────────────
//

export const createProfile = async (req, res) => {
  try {
    const {
      role, name, age,
      paymentMethod, bankAccount, bankCode, mpesaPhoneNumber
    } = req.body;

    const category  = req.body.category?.trim() || null;
    const languages = JSON.parse(req.body.languages||'[]');
    const ageGroup = JSON.parse(req.body.ageGroup || '[]')

    // files…
    const imageFiles = ['image1','image2','image3','image4'].map(k => req.files?.[k]?.[0]).filter(Boolean);
    const videoFile  = req.files?.video?.[0] || null;

    const galleryUploads = role==='tutor' && imageFiles.length
      ? await uploadToCloudinary(imageFiles,'image') : [];
    const gallery = galleryUploads.map(u=>u.url);

    const videoUrl = role==='tutor' && videoFile
      ? (await uploadToCloudinary([videoFile],'video'))[0].url : null;

    // 🔹 payout prefs
    const payout = normalizePayoutFromBody(
      { ...req.body, mpesaPhoneNumber },
      role
    );
    if (payout.error) return res.status(400).json({ message: payout.error });

    const payload = {
      role, name, age: parseInt(age,10),
      languages,
       ageGroup,
      ...(role==='tutor' && {
        category, gallery, video: videoUrl,
        description: {
          bio:            req.body['description.bio'],
          expertise:      JSON.parse(req.body['description.expertise']||'[]'),
          teachingStyle:  JSON.parse(req.body['description.teachingStyle']||'[]'),
        },
        pricing:        JSON.parse(req.body.pricing||'{}'),
        paymentMethod,
        bankAccount,
        bankCode,
        mpesaPhoneNumber: payout.mpesa_phone_number, // ensure normalized
        payoutCurrency:   payout.payout_currency,
        payoutMethod:     payout.payout_method,
        stripeConnectId:  payout.stripe_connect_id,
        paypalEmail:      payout.paypal_email,
      }),
    };

    const { error } = profileValidationSchema.validate(payload);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const insertSQL = `
      INSERT INTO profiles
        (user_id, role, name, age, languages, age_group,
         category, description, pricing,
         gallery, video, payment_method,
         bank_account, bank_code, mpesa_phone_number,
         payout_currency, payout_method, stripe_connect_id, paypal_email
        )
      VALUES
        ($1,$2,$3,$4,$5,$6,
         $7,$8,$9,
         $10,$11,$12,
         $13,$14,$15,
         $16,$17,$18,$19)
      RETURNING *;
    `;
    const params = [
      req.user.id,
      payload.role,
      payload.name,
      payload.age,
      payload.languages,
      payload.ageGroup,
      payload.category,
      JSON.stringify(payload.description),
      JSON.stringify(payload.pricing),
      payload.gallery,
      payload.video,
      payload.paymentMethod,
      payload.bankAccount,
      payload.bankCode,
      payload.mpesaPhoneNumber,
      payload.payoutCurrency || 'USD',    // ✅ USD default
      payload.payoutMethod   || 'stripe', // ✅ Stripe default
      payload.stripeConnectId || null,
      payload.paypalEmail     || null,
    ];

    const { rows } = await pool.query(insertSQL, params);
    res.status(201).json({ success:true, profile: rows[0] });
  } catch (err) {
    console.error('createProfile error:', err);
    res.status(500).json({ message:'Failed to create profile.' });
  }
};


//
// ─── 2. Create Profile (JSON body with array fields only) ────────────────────
//

export const createProfileJson = async (req, res) => {
  try {
    // 1) Raw payload + light coercion
    const payload = req.body;

    const languagesIn  = Array.isArray(payload.languages) ? payload.languages : JSON.parse(payload.languages || '[]');
    const ageGroupIn   = Array.isArray(payload.ageGroup)  ? payload.ageGroup  : JSON.parse(payload.ageGroup  || '[]');
    const galleryIn    = Array.isArray(payload.gallery)   ? payload.gallery   : [];
    const videoIn      = payload.video ?? null;

    // 2) Normalize payout (tutor only)
    const payout = normalizePayoutFromBody(payload, payload.role);
    if (payout.error) {
      console.error('normalizePayoutFromBody → error:', payout.error, 'payload:', payload);
      return res.status(400).json({ message: payout.error });
    }

    // 3) Build object for Joi (omit forbidden keys)
    const isTutor = String(payload.role).toLowerCase() === 'tutor';
    const payoutFields = isTutor
      ? {
          payoutCurrency: payout.payout_currency,
          payoutMethod:   payout.payout_method,
          ...(payout.payout_currency === 'KES'   && payout.mpesa_phone_number ? { mpesaPhoneNumber: payout.mpesa_phone_number } : {}),
          ...(payout.payout_method   === 'stripe' && payout.stripe_connect_id  ? { stripeConnectId: payout.stripe_connect_id }  : {}),
          ...(payout.payout_method   === 'paypal' && payout.paypal_email       ? { paypalEmail: payout.paypal_email }           : {}),
        }
      : {};

    const toValidate = {
      ...payload,
      languages: languagesIn,
      ageGroup:  ageGroupIn,
      gallery:   galleryIn,
      video:     videoIn,
      ...(isTutor ? payoutFields : {}),
    };

    // 4) Validate
    const { error, value } = profileValidationSchema.validate(toValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    console.log('createProfileJson → incoming payload:', JSON.stringify(payload, null, 2));
    console.log('createProfileJson → normalized/validated candidate (toValidate):', JSON.stringify(toValidate, null, 2));

    if (error) {
      console.error('createProfileJson → Joi error details:', error.details);
      return res.status(400).json({ message: error.details[0].message });
    }

    // 5) Use sanitized values
    const {
      role, name, age,
      languages, ageGroup,
      category, description, pricing,
      paymentMethod, bankAccount, bankCode,
      payoutCurrency, payoutMethod, stripeConnectId, paypalEmail,
      mpesaPhoneNumber,
      gallery, video,
    } = value;

    const insertSQL = `
      INSERT INTO profiles
        (user_id, role, name, age, languages, age_group,
         category, description, pricing,
         gallery, video, payment_method,
         bank_account, bank_code, mpesa_phone_number,
         payout_currency, payout_method, stripe_connect_id, paypal_email
        )
      VALUES
        ($1,$2,$3,$4,$5,$6,
         $7,$8,$9,
         $10,$11,$12,
         $13,$14,$15,
         $16,$17,$18,$19)
      RETURNING *;
    `;

    // ⚠️ Correct param order — includes "name" at $3
    const params = [
      req.user.id,                 // $1
      role,                        // $2
      name,                        // $3
      typeof age === 'number' ? age : parseInt(age, 10), // $4
      languages,                   // $5 (array -> jsonb)
      ageGroup,                    // $6 (array -> jsonb)
      isTutor ? category : null,   // $7
      isTutor ? JSON.stringify(description || {}) : null, // $8 json
      isTutor ? JSON.stringify(pricing || {})     : null, // $9 json
      isTutor ? gallery : null,    // $10 (array -> jsonb)
      isTutor ? video   : null,    // $11
      isTutor ? (paymentMethod ?? null)   : null, // $12
      isTutor ? (bankAccount ?? null)     : null, // $13
      isTutor ? (bankCode ?? null)        : null, // $14
      isTutor ? (mpesaPhoneNumber ?? null): null, // $15
      isTutor ? (payoutCurrency || 'USD') : null, // $16
      isTutor ? (payoutMethod   || 'stripe') : null, // $17
      isTutor ? (stripeConnectId ?? null) : null, // $18
      isTutor ? (paypalEmail    ?? null) : null, // $19
    ];

    // Sanity check
    if (params.length !== 19) {
      console.error('createProfileJson → params length mismatch:', params.length);
      return res.status(500).json({ message: 'Server error: SQL params mismatch.' });
    }

    console.log('createProfileJson → final SQL params snapshot:', {
      user_id: params[0],
      role: params[1],
      name: params[2],
      age: params[3],
      languages: params[4],
      ageGroup: params[5],
      category: params[6],
      description: isTutor ? (JSON.stringify(description || {}).slice(0, 120) + '…') : null,
      pricing: isTutor ? (JSON.stringify(pricing || {}).slice(0, 120) + '…') : null,
      galleryCount: isTutor ? (Array.isArray(gallery) ? gallery.length : 0) : null,
      hasVideo: isTutor ? Boolean(video) : null,
      paymentMethod: params[11],
      mpesa_phone_number: params[14],
      payout_currency: params[15],
      payout_method: params[16],
      stripe_connect_id: params[17],
      paypal_email: params[18],
    });

    const { rows } = await pool.query(insertSQL, params);
    return res.status(201).json({ success: true, profile: rows[0] });

  } catch (err) {
    console.error('createProfileJson error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};


export const updateProfileVideoJson = async (req, res) => {
  try {
    const { video } = req.body || {};
    if (!video || typeof video !== 'string') {
      return res.status(400).json({ message: 'Missing video url.' });
    }
    const { rows } = await pool.query(
      'UPDATE profiles SET video = $1 WHERE user_id = $2 RETURNING *',
      [video, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Profile not found.' });
    return res.json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error('updateProfileVideoJson error:', err);
    return res.status(500).json({ message: 'Failed to update video.' });
  }
};


export const updateProfile = async (req, res) => {
  console.log('Received data on backend:', req.body);
  try {
    const {
      name, age: ageStr, status, category, pricing, languages,
      experienceLevel, recommended, ageGroup,
      paymentMethod, bankAccount, bankCode, mpesaPhoneNumber,
      gallery: rawGallery,
      // NEW optional fields:
      payoutCurrency, payoutMethod, stripeConnectId, paypalEmail,
    } = req.body;

    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!profileResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }
    const profile = profileResult.rows[0];
    const normalizedRole = (profile.role || '').toLowerCase();

    const age = parseInt(ageStr, 10);
    const parsedLanguages = Array.isArray(languages) ? languages : [];
    const parsedAgeGroup  = Array.isArray(ageGroup)  ? ageGroup  : [];

    let parsedGallery = [];
    if (rawGallery != null) {
      if (Array.isArray(rawGallery)) parsedGallery = rawGallery;
      else if (typeof rawGallery === 'string') {
        try {
          const arr = JSON.parse(rawGallery);
          parsedGallery = Array.isArray(arr) ? arr : [rawGallery];
        } catch { parsedGallery = [rawGallery]; }
      }
    }

    let description = null;
    if (normalizedRole === 'tutor') {
      const desc = req.body.description || {};
      description = {
        bio: desc.bio ?? profile.description?.bio ?? '',
        expertise: Array.isArray(desc.expertise) ? desc.expertise : (profile.description?.expertise || []),
        teachingStyle: Array.isArray(desc.teachingStyle) ? desc.teachingStyle : (profile.description?.teachingStyle || []),
      };
    }

    // 🔹 Normalize payout based on body (tutor only)
    const payout = normalizePayoutFromBody(
      {
        payoutCurrency, payoutMethod,
        stripeConnectId, stripe_connect_id: stripeConnectId,
        paypalEmail,    paypal_email:      paypalEmail,
        mpesaPhoneNumber: mpesaPhoneNumber ?? profile.mpesa_phone_number,
      },
      normalizedRole
    );
    if (payout.error) return res.status(400).json({ success:false, message: payout.error });

    // ✅ Option A: include only applicable payout fields
    const validationData = {
      role: normalizedRole,
      name, age, languages: parsedLanguages, ageGroup: parsedAgeGroup,
      video: req.body.video, gallery: parsedGallery,
      ...(normalizedRole === 'tutor' && { category, pricing, recommended, experienceLevel, description, status }),
      ...(normalizedRole === 'tutor' && {
        paymentMethod, bankAccount, bankCode,
        payoutCurrency: payout.payout_currency,
        payoutMethod:   payout.payout_method,
        ...(payout.payout_currency === 'KES' ? {
          mpesaPhoneNumber: payout.mpesa_phone_number
        } : {}),
        ...(payout.payout_currency === 'USD' && payout.payout_method === 'stripe' && payout.stripe_connect_id ? {
          stripeConnectId: payout.stripe_connect_id
        } : {}),
        ...(payout.payout_currency === 'USD' && payout.payout_method === 'paypal' && payout.paypal_email ? {
          paypalEmail: payout.paypal_email
        } : {}),
      }),
    };

    console.log('updateProfile → validationData:', JSON.stringify(validationData, null, 2));

    const { error, value } = profileUpdateValidationSchema.validate(
      validationData, { stripUnknown: true }
    );
    if (error) {
      console.error('Validation Error:', error.details);
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    // Prepare update object
    const updatedData = {
      name: value.name ?? profile.name,
      age: value.age ?? profile.age,
      languages: value.languages ?? profile.languages,
      age_group: value.ageGroup ?? profile.age_group,
      category: normalizedRole === 'tutor' ? (value.category ?? profile.category) : profile.category,
      description: normalizedRole === 'tutor' ? JSON.stringify(value.description) : profile.description,
      pricing: normalizedRole === 'tutor' ? JSON.stringify(value.pricing) : profile.pricing,
      experience_level: normalizedRole === 'tutor' ? value.experienceLevel : profile.experience_level,
      status: normalizedRole === 'tutor' ? value.status : profile.status,
      recommended: normalizedRole === 'tutor' ? value.recommended : profile.recommended,
      payment_method: normalizedRole === 'tutor' ? value.paymentMethod : profile.payment_method,
      bank_account: normalizedRole === 'tutor' && value.paymentMethod === 'bank' ? value.bankAccount : profile.bank_account,
      bank_code: normalizedRole === 'tutor' && value.paymentMethod === 'bank' ? value.bankCode : profile.bank_code,
      mpesa_phone_number: normalizedRole === 'tutor' && value.paymentMethod === 'mpesa'
        ? (value.mpesaPhoneNumber || payout.mpesa_phone_number)
        : (payout.mpesa_phone_number || profile.mpesa_phone_number),
      gallery: parsedGallery.length ? parsedGallery : profile.gallery,
      video: normalizedRole === 'tutor' && typeof value.video === 'string' ? value.video : profile.video,

      // NEW payout prefs (fallbacks → USD/stripe)
      payout_currency: normalizedRole === 'tutor'
        ? (payout.payout_currency || profile.payout_currency || 'USD')
        : profile.payout_currency,
      payout_method: normalizedRole === 'tutor'
        ? (payout.payout_method || profile.payout_method || 'stripe')
        : profile.payout_method,

      stripe_connect_id: normalizedRole === 'tutor'
        ? (payout.stripe_connect_id || profile.stripe_connect_id || null)
        : profile.stripe_connect_id,
      paypal_email: normalizedRole === 'tutor'
        ? (payout.paypal_email || profile.paypal_email || null)
        : profile.paypal_email,
    };

    // handle new file uploads
    const images = ['image1','image2','image3','image4'].map(k => req.files?.[k]?.[0]).filter(Boolean);
    if (images.length) {
      const uploaded = await uploadToCloudinary(images, 'image');
      updatedData.gallery = uploaded.map(u => u.url);
    }
    if (normalizedRole === 'tutor' && req.files?.video?.[0]) {
      const [videoUploaded] = await uploadToCloudinary([req.files.video[0]], 'video');
      updatedData.video = videoUploaded.url || updatedData.video;
    }

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
        video = $16,
        payout_currency = $17,
        payout_method   = $18,
        stripe_connect_id = $19,
        paypal_email      = $20
      WHERE user_id = $21
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
      updatedData.payout_currency,
      updatedData.payout_method,
      updatedData.stripe_connect_id,
      updatedData.paypal_email,
      req.user.id,
    ];

    const result = await pool.query(updateQuery, params);
    res.status(200).json({ success: true, profile: result.rows[0] });
  } catch (err) {
    console.error('Error in updateProfile:', err);
    res.status(500).json({ message: 'Failed to update profile.', error: err.message });
  }
};


// ─── 4. Get User Profile ────────────────────────────────────────────────────
export const getUserProfile = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!rows.length) {
      return res.json({ profileExists: false, profile: { gallery: [] } });
    }
    const prof = rows[0];
    prof.gallery = Array.isArray(prof.gallery) ? prof.gallery : [];
    res.json({ profileExists: true, profile: prof });
  } catch (err) {
    console.error('getUserProfile error:', err);
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

// ─── 5. Toggle Notifications ────────────────────────────────────────────────
export const toggleNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE profiles SET notifications = NOT notifications WHERE user_id = $1 RETURNING *',
      [req.user.id]
    );
    res.json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error('toggleNotifications error:', err);
    res.status(500).json({ message: 'Failed to toggle notifications.' });
  }
};

// ─── 6. Add Recent Chat ─────────────────────────────────────────────────────
export const addRecentChat = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE profiles SET recent_chats_count = recent_chats_count + 1 WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    res.json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error('addRecentChat error:', err);
    res.status(500).json({ message: 'Failed to update recent chats.' });
  }
};

// ─── 7. Update Rating ────────────────────────────────────────────────────────
export const updateRating = async (req, res) => {
  try {
    const rating = parseFloat(req.body.rating);
    if (isNaN(rating)) return res.status(400).json({ message: 'Invalid rating.' });
    const { rows } = await pool.query(
      `UPDATE profiles
         SET rating_total = rating_total + $1,
             rating_count = rating_count + 1
       WHERE id = $2
       RETURNING *`,
      [rating, req.params.id]
    );
    res.json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error('updateRating error:', err);
    res.status(500).json({ message: 'Failed to update rating.' });
  }
};

// ─── 8. Get Profiles with Filters ───────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const {
      status, experienceLevel, expertise, teachingStyle,
      ageGroup, languageFluency, pricing, category, attribute,
    } = req.query;

    const conditions = ['role = \'tutor\''];
    const values     = [];
    let   idx        = 1;

    if (experienceLevel) {
      conditions.push(`experience_level = $${idx++}`);
      values.push(experienceLevel);
    }
    if (teachingStyle) {
      conditions.push(`(description->'teachingStyle') ?| $${idx++}`);
      values.push(teachingStyle.split(',').map(s=>s.trim()));
    }
    if (expertise) {
      conditions.push(`(description->'expertise') ?| $${idx++}`);
      values.push(expertise.split(',').map(s=>s.trim()));
    }
    if (ageGroup) {
      conditions.push(`age_group ?| $${idx++}`);
      values.push(ageGroup.split(',').map(s=>s.trim()));
    }
    if (languageFluency) {
      conditions.push(`language_fluency = $${idx++}`);
      values.push(languageFluency);
    }
    if (pricing) {
      const [min,max] = pricing.split('-').map(Number);
      conditions.push(`(
        ((pricing->>'privateSession')::numeric BETWEEN $${idx} AND $${idx+1})
        OR ((pricing->>'groupSession')::numeric BETWEEN $${idx} AND $${idx+1})
        OR ((pricing->>'lecture')::numeric BETWEEN $${idx} AND $${idx+1})
        OR ((pricing->>'workshop')::numeric BETWEEN $${idx} AND $${idx+1})
      )`);
      values.push(min, max);
      idx += 2;
    }
    if (category) {
      conditions.push(`category = $${idx++}`);
      values.push(category);
    }
    if (attribute) {
      conditions.push(`attributes = $${idx++}`);
      values.push(attribute);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }

    const sql = `
      SELECT id, user_id, role, name, age, languages,
             gallery, video, status, category,
             pricing, description,experience_level, age_group
      FROM profiles
      WHERE ${conditions.join(' AND ')}
      ORDER BY id DESC
      LIMIT 20;
    `;
    const { rows } = await pool.query(sql, values);
    res.json({ success: true, profiles: rows });

  } catch (err) {
    console.error('getProfile error:', err);
    res.status(500).json({ message: 'Failed to fetch profiles.' });
  }
};

// ─── 9. Get Profile by ID ───────────────────────────────────────────────────
export const getProfileById = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id.' });

  try {
    const sql = `
      SELECT id,
             user_id AS "user",
             name, pricing, category,
             gallery, video, role,
             status, description,
             recommended, certified, languages
      FROM profiles
      WHERE id = $1;
    `;
    const { rows } = await pool.query(sql, [id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getProfileById error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ───10. Remove Profile Item ────────────────────────────────────────────────
export const removeProfileItem = async (req, res) => {
  const { id, field } = req.params;
  const item = req.body.item;

  try {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1',[id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found.' });
    let profile = rows[0];

    if (field === 'gallery') {
      const pid = getPublicIdFromUrl(item);
      await deleteFromCloudinary([pid]);
      const updated = profile.gallery.filter(u => u !== item);
      const upd = await pool.query(
        'UPDATE profiles SET gallery = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(updated), id]
      );
      profile = upd.rows[0];

    } else if (field === 'video') {
      if (profile.video) {
        const pid = getPublicIdFromUrl(profile.video);
        await deleteFromCloudinary([pid]);
      }
      const upd = await pool.query(
        'UPDATE profiles SET video = $1 WHERE id = $2 RETURNING *',
        ['', id]
      );
      profile = upd.rows[0];

    } else {
      // assume array field
      const arr = profile[field] || [];
      if (!Array.isArray(arr)) {
        return res.status(400).json({ message: 'Field not array.' });
      }
      const updatedArr = arr.filter(v => v !== item);
      const upd = await pool.query(
        `UPDATE profiles SET ${field} = $1 WHERE id = $2 RETURNING *`,
        [JSON.stringify(updatedArr), id]
      );
      profile = upd.rows[0];
    }

    res.json({ success: true, profile });
  } catch (err) {
    console.error('removeProfileItem error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ───11. Upload Single File ─────────────────────────────────────────────────
export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file.' });
    const resourceType = ['mp4','mov'].includes(req.file.mimetype.split('/')[1])
      ? 'video'
      : 'image';
    const [upload] = await uploadToCloudinary([req.file], resourceType);
    res.json({ url: upload.url });
  } catch (err) {
    console.error('uploadSingleFile error:', err);
    res.status(500).json({ message: 'Upload failed.' });
  }
};

// ───12. Profile with Recommendations ────────────────────────────────────────
export const getProfileWithRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1',[id]);
    if (!rows.length) return res.status(404).json({ message: 'Not found.' });
    const profile = rows[0];
    if (Array.isArray(profile.recommended) && profile.recommended.length) {
      const rec = await pool.query(
        'SELECT id,name,status,gallery FROM profiles WHERE id = ANY($1)',
        [profile.recommended]
      );
      profile.recommended = rec.rows;
    } else {
      profile.recommended = [];
    }
    res.json(profile);
  } catch (err) {
    console.error('getProfileWithRecommendations error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};


// ───13. Get Profile by User ID ─────────────────────────────────────────────
export const getProfileByUserId = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ message: 'Invalid userId.' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM profiles WHERE user_id=$1 AND role='tutor'`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getProfileByUserId error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ───14. Get Random Profile ─────────────────────────────────────────────────
export const getRandomProfile = async (req, res) => {
  try {
    const { rows: [{ count }] } = await pool.query(
      `SELECT COUNT(*) FROM profiles WHERE role='tutor'`
    );
    const total = parseInt(count, 10);
    if (!total) return res.status(404).json({ message: 'No tutors.' });
    const offset = Math.floor(Math.random() * total);
    const { rows } = await pool.query(
      `SELECT id,name,role,gallery,category,description
       FROM profiles
       WHERE role='tutor'
       LIMIT 1 OFFSET $1`,
      [offset]
    );
    const prof = rows[0];
    let desc = {};
    try { desc = JSON.parse(prof.description || '{}'); } catch {}
    res.json({
      id:           prof.id,
      name:         prof.name,
      role:         prof.role,
      gallery:      prof.gallery,
      category:     prof.category,
      expertise:    desc.expertise || [],
      teachingStyle: desc.teachingStyle || [],
    });
  } catch (err) {
    console.error('getRandomProfile error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};
