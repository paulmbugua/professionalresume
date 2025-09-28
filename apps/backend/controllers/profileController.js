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
const deleteFromCloudinary = async (publicIds, resourceType = 'image') => {
  try {
    await cloudinary.api.delete_resources(publicIds, { resource_type: resourceType });
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
      role,
      name,
      age,
      paymentMethod,  // legacy (only used if KES)
      bankAccount,    // legacy
      bankCode,       // legacy
      mpesaPhoneNumber, // may come un-normalized
      status,         // optional (tutor)
      notifications,  // optional (tutor)
    } = req.body;

    // ------------------------------------------------------------------
    // Parse common fields sent from web/native
    // ------------------------------------------------------------------
    const category  = (req.body.category || '').trim() || null;
    const languages = safeParseJson(req.body.languages, []);
    const ageGroup  = safeParseJson(req.body.ageGroup, []); // REQUIRED for both roles (see validator)

    // Description parts (arrays are stringified on upload)
    const descBio           = req.body['description.bio'] || '';
    const descExpertise     = safeParseJson(req.body['description.expertise'], []);
    const descTeachingStyle = safeParseJson(req.body['description.teachingStyle'], []);

    // Pricing (stringified JSON)
    const pricing = safeParseJson(req.body.pricing, {});

    // ------------------------------------------------------------------
    // Region/Country/GradeBand are now OPTIONAL UI hints and live
    // INSIDE description to avoid DB migrations.
    // Accept a few shapes from the client (lenient parsing).
    // ------------------------------------------------------------------
    const uiRegion  = (req.body.region || '').trim();                 // e.g. "africa"
    const uiCountry = String(req.body.country || '').toUpperCase();   // e.g. "KE"
    // Prefer a single key; fallback to first from gradeBands/gradeBandLabel
    const uiGradeBandKey =
      (req.body.gradeBandKey || '').trim() ||
      firstOfArrayish(req.body.gradeBands) ||
      (req.body.gradeBandLabel || '').trim() ||
      '';

    // ------------------------------------------------------------------
    // Uploads
    // ------------------------------------------------------------------
    const imageFiles = ['image1', 'image2', 'image3', 'image4']
      .map((k) => req.files?.[k]?.[0])
      .filter(Boolean);

    const videoFile = req.files?.video?.[0] || null;

    const galleryUploads =
      role === 'tutor' && imageFiles.length
        ? await uploadToCloudinary(imageFiles, 'image')
        : [];
    const gallery = galleryUploads.map((u) => u.url);

    const videoUrl =
      role === 'tutor' && videoFile
        ? (await uploadToCloudinary([videoFile], 'video'))[0].url
        : null;

    // ------------------------------------------------------------------
    // Payout prefs (wise/mpesa). Ensure method↔currency and contacts match.
    // ------------------------------------------------------------------
    const payout = normalizePayoutFromBody({ ...req.body, mpesaPhoneNumber }, role);
    if (payout.error) {
      return res.status(400).json({ message: payout.error });
    }

    // ------------------------------------------------------------------
    // Build payload that matches the Joi validator (geo lives in description.*)
    // ------------------------------------------------------------------
    const description = {
      bio: descBio,
      expertise: descExpertise,
      teachingStyle: descTeachingStyle,
      // ➕ New UI-only metadata (optional):
      region: uiRegion || null,
      country: uiCountry || null,
      gradeBandKey: uiGradeBandKey || null,
    };

    const payload = {
      role,
      name,
      age: parseInt(age, 10),
      languages,
      ageGroup, // now required for both roles

      ...(role === 'tutor' && {
        category,
        gallery,
        video: videoUrl,
        description,
        pricing,
        // Optional tutor flags:
        status,
        notifications: toBooleanOrUndefined(notifications),

        // Legacy-only (still allowed if KES)
        paymentMethod,
        bankAccount,
        bankCode,

        // Normalized payout
        mpesaPhoneNumber: payout.mpesa_phone_number,
        payoutCurrency:   payout.payout_currency, // 'KES' | 'USD'
        payoutMethod:     payout.payout_method,   // 'mpesa' | 'wise'
        stripeConnectId:  payout.stripe_connect_id || null,
        paypalEmail:      payout.paypal_email || null,
      }),
    };

    // ------------------------------------------------------------------
    // Validate against the UPDATED schemas
    // ------------------------------------------------------------------
    const { error } = profileValidationSchema.validate(payload);
    if (error) {
      return res.status(400).json({ message: error.details?.[0]?.message || 'Invalid payload' });
    }

    // ------------------------------------------------------------------
    // Insert — keep a single JSONB "description" column (no new geo columns)
    // ------------------------------------------------------------------
    const insertSQL = `
      INSERT INTO profiles
        (user_id, role, name, age, languages, age_group,
         category, description, pricing,
         gallery, video, payment_method,
         bank_account, bank_code, mpesa_phone_number,
         payout_currency, payout_method, stripe_connect_id, paypal_email,
         status, notifications)
      VALUES
        ($1,$2,$3,$4,$5,$6,
         $7,$8,$9,
         $10,$11,$12,
         $13,$14,$15,
         $16,$17,$18,$19,
         $20,$21)
      RETURNING *;
    `;

    const params = [
      req.user.id,                      // $1
      payload.role,                     // $2
      payload.name,                     // $3
      payload.age,                      // $4
      payload.languages,                // $5
      payload.ageGroup,                 // $6

      role === 'tutor' ? payload.category : null,            // $7
      role === 'tutor' ? JSON.stringify(payload.description) : null, // $8
      role === 'tutor' ? JSON.stringify(payload.pricing) : null,     // $9

      role === 'tutor' ? payload.gallery : null,             // $10
      role === 'tutor' ? payload.video : null,               // $11
      role === 'tutor' ? payload.paymentMethod : null,       // $12 (legacy, KES only)

      role === 'tutor' ? payload.bankAccount : null,         // $13
      role === 'tutor' ? payload.bankCode : null,            // $14
      role === 'tutor' ? payload.mpesaPhoneNumber : null,    // $15

      role === 'tutor' ? (payload.payoutCurrency || 'USD') : null, // $16
      role === 'tutor' ? (payload.payoutMethod   || 'wise') : null, // $17
      role === 'tutor' ? payload.stripeConnectId : null,     // $18
      role === 'tutor' ? payload.paypalEmail     : null,     // $19

      role === 'tutor' ? (payload.status || null) : null,            // $20
      role === 'tutor' ? (payload.notifications ?? null) : null,     // $21
    ];

    const { rows } = await pool.query(insertSQL, params);
    return res.status(201).json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error('createProfile error:', err);
    return res.status(500).json({ message: 'Failed to create profile.' });
  }
};

/* ───────────────────────────── helpers ───────────────────────────── */
function safeParseJson(raw, fallback) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) || typeof v === 'object' ? v : fallback;
  } catch {
    return fallback;
  }
}

function firstOfArrayish(maybeJson) {
  const arr = safeParseJson(maybeJson, []);
  return Array.isArray(arr) && arr.length ? String(arr[0]).trim() : '';
}

function toBooleanOrUndefined(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return undefined;
}

//
// ─── 2. Create Profile (JSON body with array fields only) ────────────────────
//

export const createProfileJson = async (req, res) => {
  try {
    const raw = req.body || {};
    const isTutor = String(raw.role || '').toLowerCase() === 'tutor';

    // ─────────────────────────── parse helpers ───────────────────────────
    const arr = (v, fb = []) => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try { const p = JSON.parse(v); return Array.isArray(p) ? p : fb; } catch { return fb; }
      }
      return fb;
    };
    const num = (v, fb = 0) => (typeof v === 'number' ? v : parseInt(v, 10)) || fb;
    const bool = (v) => (typeof v === 'boolean' ? v : (typeof v === 'string' ? v.toLowerCase() === 'true' : undefined));

    // ─────────────────────── common parsed inputs ────────────────────────
    const languages = arr(raw.languages, []);
    const ageGroup  = arr(raw.ageGroup, []); // REQUIRED by validator for BOTH roles
    const gallery   = isTutor ? (Array.isArray(raw.gallery) ? raw.gallery : []) : undefined;
    const video     = isTutor ? (raw.video ?? null) : undefined;

    // description parts
    const descBio           = raw['description.bio'] || (raw.description?.bio ?? '');
    const descExpertise     = arr(raw['description.expertise'] ?? raw.description?.expertise, []);
    const descTeachingStyle = arr(raw['description.teachingStyle'] ?? raw.description?.teachingStyle, []);

    // geo UI-only → stored inside description.*
    const region  = (raw.region || '').trim();
    const country = String(raw.country || '').trim().toUpperCase();
    const gradeBandKey =
      (raw.gradeBandKey || '').trim()
      || (function firstGradeBand() {
            const gb = arr(raw.gradeBands, []);
            if (gb.length) return String(gb[0]).trim();
            const lbl = (raw.gradeBandLabel || '').trim();
            return lbl || '';
         })();

    // status / notifications (tutor only, optional)
    const status         = isTutor ? (raw.status || undefined) : undefined;
    const notifications  = isTutor ? bool(raw.notifications) : undefined;

    // ─────────────────────── normalize payout (tutor) ────────────────────
    // JSON route: only support wise/mpesa (no stripe/paypal)
    const payout = normalizePayoutFromBody(raw, raw.role);
    if (payout.error) {
      console.error('normalizePayoutFromBody → error:', payout.error, 'payload:', raw);
      return res.status(400).json({ message: payout.error });
    }

    // ───────────────────── build object for Joi validation ───────────────
    const toValidate = {
      role: raw.role,
      name: (raw.name || '').trim(),
      age: num(raw.age),
      languages,
      ageGroup,

      ...(isTutor && {
        category: (raw.category || '').trim(),
        gallery,
        video,

        description: {
          bio: descBio,
          expertise: descExpertise,
          teachingStyle: descTeachingStyle,
          // geo (UI-only)
          region: region || null,
          country: country || null,
          gradeBandKey: gradeBandKey || null,
        },

        pricing: typeof raw.pricing === 'object' ? raw.pricing : (function () {
          if (typeof raw.pricing === 'string') {
            try { return JSON.parse(raw.pricing); } catch { return {}; }
          }
          return {};
        })(),

        // payout (wise/mpesa only)
        payoutCurrency: payout.payout_currency, // 'USD' | 'KES'
        payoutMethod:   payout.payout_method,   // 'wise' | 'mpesa'
        ...(payout.payout_method === 'mpesa' ? { mpesaPhoneNumber: payout.mpesa_phone_number } : {}),

        // tutor state (optional)
        status,
        ...(typeof notifications === 'boolean' ? { notifications } : {}),
      }),
    };

    const { error, value } = profileValidationSchema.validate(toValidate, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      console.error('createProfileJson → Joi error details:', error.details);
      return res.status(400).json({ message: error.details[0].message });
    }

    // unpack sanitized values
    const {
      role, name, age,
      languages: valLangs, ageGroup: valAgeGroup,
      category, description, pricing,
      payoutCurrency, payoutMethod, mpesaPhoneNumber,
      gallery: valGallery, video: valVideo,
      status: valStatus, notifications: valNotifications,
    } = value;

    // ───────────────────────────── insert SQL ─────────────────────────────
    // Parity with file-upload createProfile: also persist status, notifications
    const insertSQL = `
      INSERT INTO profiles
        (user_id, role, name, age, languages, age_group,
         category, description, pricing,
         gallery, video, payment_method,
         bank_account, bank_code, mpesa_phone_number,
         payout_currency, payout_method, stripe_connect_id, paypal_email,
         status, notifications)
      VALUES
        ($1,$2,$3,$4,$5,$6,
         $7,$8,$9,
         $10,$11,$12,
         $13,$14,$15,
         $16,$17,$18,$19,
         $20,$21)
      RETURNING *;
    `;

    // this JSON route no longer deals with legacy payment/bank/stripe/paypal; send nulls
    const params = [
      req.user.id,                 // $1
      role,                        // $2
      name,                        // $3
      typeof age === 'number' ? age : parseInt(age, 10), // $4
      valLangs,                    // $5
      valAgeGroup,                 // $6
      isTutor ? category : null,   // $7
      isTutor ? JSON.stringify(description || {}) : null, // $8
      isTutor ? JSON.stringify(pricing || {})     : null, // $9
      isTutor ? (valGallery || []) : null,         // $10
      isTutor ? (valVideo   || null) : null,       // $11
      null, // payment_method (legacy)          $12
      null, // bank_account (legacy)            $13
      null, // bank_code (legacy)               $14
      isTutor ? (mpesaPhoneNumber || null) : null, // $15
      isTutor ? (payoutCurrency || 'USD') : null,  // $16
      isTutor ? (payoutMethod   || 'wise') : null, // $17
      null, // stripe_connect_id                $18
      null, // paypal_email                     $19
      isTutor ? (valStatus || null) : null,                 // $20
      isTutor ? (typeof valNotifications === 'boolean' ? valNotifications : null) : null, // $21
    ];

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
    res.json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error('updateProfileVideoJson error:', err);
    res.status(500).json({ message: 'Failed to update video.' });
  }
};


export const updateProfile = async (req, res) => {
  console.log('Received data on backend:', req.body);
  try {
    // fetch current profile
    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    if (!profileResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }
    const profile = profileResult.rows[0];
    const normalizedRole = (profile.role || '').toLowerCase();
    const isTutor = normalizedRole === 'tutor';
    const body = req.body || {};

    // small parse helpers
    const arr = (v, fb = []) => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try { const p = JSON.parse(v); return Array.isArray(p) ? p : fb; } catch { return fb; }
      }
      return fb;
    };
    const num = (v) => (typeof v === 'number' ? v : parseInt(v, 10));
    const bool = (v) => (typeof v === 'boolean' ? v : (typeof v === 'string' ? v.toLowerCase() === 'true' : undefined));

    // parse basic fields
    const name = body.name;
    const age  = num(body.age);

    const parsedLanguages = Array.isArray(body.languages) ? body.languages : profile.languages || [];
    const parsedAgeGroup  = Array.isArray(body.ageGroup)  ? body.ageGroup  : profile.age_group || [];

    // gallery: prefer provided, else keep existing
    let parsedGallery = profile.gallery || [];
    if (body.gallery != null) {
      if (Array.isArray(body.gallery)) parsedGallery = body.gallery;
      else if (typeof body.gallery === 'string') {
        try {
          const gx = JSON.parse(body.gallery);
          parsedGallery = Array.isArray(gx) ? gx : parsedGallery;
        } catch {
          // if it's a single URL-like string
          parsedGallery = body.gallery ? [body.gallery] : parsedGallery;
        }
      }
    }

    // description merge (tutor)
    let description = isTutor ? (profile.description || {}) : null;
    if (isTutor) {
      // existing description could be text or object depending on driver — normalize
      try { if (typeof description === 'string') description = JSON.parse(description || '{}'); } catch {}
      const descIn = body.description || {};
      const descBio           = (descIn.bio ?? description.bio ?? '');
      const descExpertise     = Array.isArray(descIn.expertise) ? descIn.expertise : (description.expertise || []);
      const descTeachingStyle = Array.isArray(descIn.teachingStyle) ? descIn.teachingStyle : (description.teachingStyle || []);

      // geo extras (UI-only) — accept top-level too, but store inside description
      const region  = (body.region || descIn.region || description.region || '').trim();
      const country = String(body.country || descIn.country || description.country || '').trim().toUpperCase();
      const gradeBandKey =
        (body.gradeBandKey || descIn.gradeBandKey || description.gradeBandKey || '').trim()
        || (function pickFromBandList() {
             const gb = arr(body.gradeBands, []);
             if (gb.length) return String(gb[0]).trim();
             const lbl = (body.gradeBandLabel || '').trim();
             return lbl || '';
           })();

      description = {
        ...description,
        bio: descBio,
        expertise: descExpertise,
        teachingStyle: descTeachingStyle,
        region: region || null,
        country: country || null,
        gradeBandKey: gradeBandKey || null,
      };
    }

    // tutor-specific toggles
    const status        = isTutor ? (body.status ?? profile.status ?? null) : profile.status;
    const notifications = isTutor ? (bool(body.notifications) ?? profile.notifications ?? null) : profile.notifications;

    // payout (tutor only) → wise/mpesa
    const payout = normalizePayoutFromBody(
      {
        payoutCurrency: body.payoutCurrency,
        payoutMethod:   body.payoutMethod,
        mpesaPhoneNumber: body.mpesaPhoneNumber ?? profile.mpesa_phone_number,
      },
      normalizedRole
    );
    if (payout.error) {
      return res.status(400).json({ success: false, message: payout.error });
    }

    // Build validation candidate (only fields allowed by the Joi update schema)
    const validationData = {
      role: normalizedRole,
      name,
      age,
      languages: parsedLanguages,
      ageGroup: parsedAgeGroup,
      ...(isTutor && {
        category: body.category,
        pricing:  typeof body.pricing === 'object' ? body.pricing : (function () {
          if (typeof body.pricing === 'string') { try { return JSON.parse(body.pricing); } catch { return undefined; } }
          return undefined;
        })(),
        recommended: Array.isArray(body.recommended) ? body.recommended : undefined,
        experienceLevel: body.experienceLevel,
        description,       // includes geo extras
        status,
        // media (urls/paths handled by validator)
        gallery: parsedGallery,
        video: typeof body.video === 'string' ? body.video : undefined,

        // payout
        payoutCurrency: payout.payout_currency, // 'USD' | 'KES'
        payoutMethod:   payout.payout_method,   // 'wise' | 'mpesa'
        ...(payout.payout_method === 'mpesa' ? { mpesaPhoneNumber: payout.mpesa_phone_number } : {}),
        // notifications is not in the Joi schema (create/update)? — it is allowed on update
        notifications,
      }),
    };

    console.log('updateProfile → validationData:', JSON.stringify(validationData, null, 2));

    const { error, value } = profileUpdateValidationSchema.validate(
      validationData,
      { stripUnknown: true, abortEarly: false }
    );

    if (error) {
      console.error('Validation Error:', error.details);
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    // keep existing for forbidden/omitted fields
    const updatedData = {
      name: value.name ?? profile.name,
      age:  value.age ?? profile.age,
      languages: value.languages ?? profile.languages,
      age_group: value.ageGroup ?? profile.age_group,

      category: isTutor ? (value.category ?? profile.category) : profile.category,
      description: isTutor ? JSON.stringify(value.description ?? description ?? profile.description ?? {}) : profile.description,
      pricing:     isTutor ? JSON.stringify(value.pricing ?? profile.pricing ?? {}) : profile.pricing,
      experience_level: isTutor ? (value.experienceLevel ?? profile.experience_level ?? null) : profile.experience_level,
      status: isTutor ? (value.status ?? status ?? profile.status ?? null) : profile.status,
      recommended: isTutor ? (value.recommended ?? profile.recommended ?? []) : profile.recommended,

      // media
      gallery: (isTutor && Array.isArray(value.gallery) && value.gallery.length) ? value.gallery : profile.gallery,
      video:   (isTutor && typeof value.video === 'string') ? value.video : profile.video,

      // payout (no stripe/paypal here)
      payout_currency: isTutor ? (value.payoutCurrency ?? payout.payout_currency ?? profile.payout_currency ?? 'USD') : profile.payout_currency,
      payout_method:   isTutor ? (value.payoutMethod   ?? payout.payout_method   ?? profile.payout_method   ?? 'wise') : profile.payout_method,
      mpesa_phone_number: isTutor
        ? (value.mpesaPhoneNumber ?? payout.mpesa_phone_number ?? profile.mpesa_phone_number ?? null)
        : profile.mpesa_phone_number,

      // notifications (optional)
      notifications: isTutor
        ? ((typeof value.notifications === 'boolean') ? value.notifications : (notifications ?? profile.notifications ?? null))
        : profile.notifications,

      // legacy (preserve)
      payment_method: profile.payment_method,
      bank_account:   profile.bank_account,
      bank_code:      profile.bank_code,

      // stripe/paypal preserved (JSON route no longer sets them)
      stripe_connect_id: profile.stripe_connect_id,
      paypal_email:      profile.paypal_email,
    };

    // handle new file uploads (if any) — images
    const images = ['image1','image2','image3','image4']
      .map(k => req.files?.[k]?.[0])
      .filter(Boolean);
    if (isTutor && images.length) {
      const uploaded = await uploadToCloudinary(images, 'image');
      updatedData.gallery = uploaded.map(u => u.url);
    }
    // video
    if (isTutor && req.files?.video?.[0]) {
      const [vid] = await uploadToCloudinary([req.files.video[0]], 'video');
      if (vid?.url) updatedData.video = vid.url;
    }

    // UPDATE (add notifications column)
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
        paypal_email      = $20,
        notifications     = $21
      WHERE user_id = $22
      RETURNING *;
    `;

    const params = [
      updatedData.name,                // $1
      updatedData.age,                 // $2
      updatedData.languages,           // $3
      updatedData.age_group,           // $4
      updatedData.category,            // $5
      updatedData.description,         // $6 (JSON string)
      updatedData.pricing,             // $7 (JSON string)
      updatedData.experience_level,    // $8
      updatedData.status,              // $9
      updatedData.recommended,         // $10
      updatedData.payment_method,      // $11  (preserved)
      updatedData.bank_account,        // $12  (preserved)
      updatedData.bank_code,           // $13  (preserved)
      updatedData.mpesa_phone_number,  // $14
      updatedData.gallery,             // $15
      updatedData.video,               // $16
      updatedData.payout_currency,     // $17
      updatedData.payout_method,       // $18
      updatedData.stripe_connect_id,   // $19  (preserved)
      updatedData.paypal_email,        // $20  (preserved)
      req.user.id,                     // $22
    ];

    const result = await pool.query(updateQuery, params);
    return res.status(200).json({ success: true, profile: result.rows[0] });
  } catch (err) {
    console.error('Error in updateProfile:', err);
    return res.status(500).json({ message: 'Failed to update profile.', error: err.message });
  }
};

// ─── 4. Get User Profile ────────────────────────────────────────────────────
export const getUserProfile = async (req, res) => {
  try {
    const rawId = req.user?.id;
    const userId = Number(rawId);

    // Admin tokens are non-numeric (e.g., "admin:email") → no profile row
    if (!Number.isInteger(userId)) {
      return res.json({ success: true, profileExists: false });
    }

    const { rows } = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (!rows.length) {
      return res.json({ success: true, profileExists: false, profile: { gallery: [] } });
    }

    const prof = rows[0];
    prof.gallery = Array.isArray(prof.gallery) ? prof.gallery : [];
    return res.json({ success: true, profileExists: true, profile: prof });
  } catch (err) {
    console.error('getUserProfile error:', err);
    return res.status(500).json({ message: 'Failed to fetch profile.' });
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
        await deleteFromCloudinary([pid], 'video');
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
    const paramType = (req.params?.type || '').toLowerCase(); // 'image' | 'video'
   const mime = req.file.mimetype || '';
   const inferred = mime.startsWith('video/') ? 'video' : 'image';
   const resourceType = (paramType === 'video' || paramType === 'image') ? paramType : inferred;

   // Optional: add a quick log while testing
   console.log('uploadSingleFile → type from param:', paramType, 'mime:', mime, '→ resourceType:', resourceType);

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
