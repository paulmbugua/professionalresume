// apps/backend/controllers/classVaultController.js

import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'
import os from 'os'
import fetch from 'node-fetch'
import { v4 as uuid } from 'uuid'
import ffmpeg from 'fluent-ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import pool from '../config/db.js'
import {
  classVaultValidationSchema,
  classVaultUpdateValidationSchema, // ✅ needed by updateVideoJson
} from '../validators/classVaultValidator.js';
import { sendNotification } from '../utils/sendNotification.js'
import { v2 as cloudinary } from 'cloudinary'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)
ffmpeg.setFfprobePath(ffprobeInstaller.path)


// ─── Helpers ──────────────────────────────────────────────────────────────────
const PLATFORM_FEE = 0.15;       // 15%
const USD_TO_KES_DEFAULT = 130;  // replace with your live rate source

async function getFxRate(base, quote) {
  if (base === 'USD' && quote === 'KES') return USD_TO_KES_DEFAULT;
  return 1; // USD->USD or KES->KES placeholder (adjust if you’ll price differently)
}
/** Upload one or more local files to Cloudinary */
async function uploadToCloudinary(files, resourceType = 'image') {
  try {
    const uploads = files.map(file =>
      cloudinary.uploader.upload(file.path, {
        resource_type: resourceType,
        folder:         'class_vault',
        public_id:      `${resourceType}/${path.basename(file.path, path.extname(file.path))}_${uuid()}`,
      }).then(res => ({ url: res.secure_url, public_id: res.public_id }))
    )
    return Promise.all(uploads)
  } catch (err) {
    console.error('Cloudinary upload error:', err)
    throw new Error('File upload failed')
  }
}

/** Delete one or more Cloudinary public_ids */
async function deleteFromCloudinary(publicIds, resourceType = 'image') {
  try {
    await cloudinary.api.delete_resources(publicIds, { resource_type: resourceType })
  } catch (err) {
    console.error('Cloudinary delete error:', err)
  }
}

/** Extract the public_id (folder/path/name) from a Cloudinary URL */
function getPublicIdFromUrl(url) {
  const parts = url.split('/upload/')
  if (parts.length < 2) return null
  return parts[1].split('.')[0]
}

// ─── FFmpeg Utilities ────────────────────────────────────────────────────────

function normalizePath(p) {
  return p.replace(/\\/g, '/')
}

function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    let stderr = ''
    ffmpeg()
      .input(normalizePath(inputPath))
      .screenshots({
        timestamps: ['00:00:01'],
        filename:   path.basename(outputPath),
        folder:     path.dirname(outputPath),
        size:       '320x240',
      })
      .on('stderr', line => { stderr += line + '\n' })
      .on('end', () => resolve())
      .on('error', err => {
        console.error('FFmpeg thumbnail error:', stderr, err)
        reject(new Error(`Thumbnail generation failed: ${err.message}`))
      })
  })
}

function generatePreview(inputPath, outputPath, duration = 30) {
  return new Promise((resolve, reject) => {
    let stderr = ''
    ffmpeg()
      .input(normalizePath(inputPath))
      .seekInput(0)
      .outputOptions([`-t ${duration}`, '-c copy'])
      .output(normalizePath(outputPath))
      .on('stderr', line => { stderr += line + '\n' })
      .on('end', resolve)
      .on('error', err => {
        console.error('FFmpeg preview error:', stderr, err)
        reject(new Error(`Preview generation failed: ${err.message}`))
      })
      .run()
  })
}


// ─── 1. Create Video (JSON) – with thumbnail & preview uploads ────────────────
export const createVideoJson = async (req, res) => {
  try {
    const { error, value } = classVaultValidationSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message })
    }

    const {
      title, description, subject, grade_level,
      price, duration, tags, video_url = '', pdf_url = '',
    } = value
    const tutor_id = req.user.id

    let thumbnail_url = null
    let preview_url   = null

    if (video_url) {
      // 1) Download video to temp file
      const makeAbsolute = url =>
        /^https?:\/\//.test(url)
          ? url
          : `${req.protocol}://${req.get('host')}${url}`

      const tmpVideo = path.join(os.tmpdir(), `${uuid()}.mp4`)
      const resp = await fetch(makeAbsolute(video_url))
      if (!resp.ok) throw new Error('Failed to download video')
      await new Promise((r, rej) => {
        const ws = createWriteStream(tmpVideo)
        resp.body.pipe(ws)
        resp.body.on('error', rej)
        ws.on('finish', r)
      })

      // 2) Generate derivatives
      const thumbLocal   = path.join(os.tmpdir(), `${uuid()}.jpg`)
      const previewLocal = path.join(os.tmpdir(), `${uuid()}.mp4`)
      await generateThumbnail(tmpVideo, thumbLocal)
      await generatePreview(tmpVideo, previewLocal, 30)

      // 3) Upload to Cloudinary
      const [thumbUpload]   = await uploadToCloudinary([{ path: thumbLocal }], 'image')
      const [previewUpload] = await uploadToCloudinary([{ path: previewLocal }], 'video')
      thumbnail_url = thumbUpload.url
      preview_url   = previewUpload.url

      // 4) Cleanup
      await Promise.all([
        fs.unlink(tmpVideo),
        fs.unlink(thumbLocal),
        fs.unlink(previewLocal),
      ])
    }

    // 5) Persist metadata
    const insertSQL = `
      INSERT INTO recorded_videos
        (tutor_id, title, description, subject, grade_level,
         price, duration, tags, video_url, pdf_url, preview_url, thumbnail_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
    `
    const result = await pool.query(insertSQL, [
      tutor_id, title, description, subject, grade_level,
      price, duration, tags, video_url || null, pdf_url || null,
      preview_url, thumbnail_url,
    ])

    return res.status(201).json({ success: true, video: result.rows[0] })
  } catch (err) {
    console.error('createVideoJson error:', err)
    return res.status(500).json({
      success: false,
      message: 'Failed to create video metadata',
      error: err.message,
    })
  }
}

/**
 * Secure download endpoint: only students who purchased may fetch URLs.
 */
export const downloadPdfOrVideo = async (req, res) => {
  try {
    const studentId = req.user.id
    const videoId   = Number(req.params.videoId)

    // ✅ Query the correct table name and column names:
    const access = await pool.query(
      `SELECT 1
         FROM classvault_purchases
        WHERE student_id = $1
          AND class_id   = $2`,
      [studentId, videoId]
    )

    if (access.rows.length === 0) {
      return res
        .status(403)
        .json({ message: 'Access denied. Please purchase the class.' })
    }

    const result = await pool.query(
      `SELECT pdf_url, video_url
         FROM recorded_videos
        WHERE id = $1`,
      [videoId]
    )
    return res.json(result.rows[0])

  } catch (err) {
    console.error('downloadPdfOrVideo error:', err)
    return res
      .status(500)
      .json({ message: 'Server error fetching resources.' })
  }
}

/** Fetch all videos (for listing) */
export const getAllVideos = async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM recorded_videos ORDER BY created_at DESC'
  )
  res.json(result.rows)
}

/** Fetch a single video’s metadata by ID */
export const getVideoById = async (req, res) => {
  const { id } = req.params
  const result = await pool.query(
    'SELECT * FROM recorded_videos WHERE id = $1',
    [id]
  )
  res.json(result.rows[0])
}


// ─── Delete Video & All Cloudinary Assets ───────────────────────────────────
export const deleteVideoById = async (req, res) => {
  try {
    const { id } = req.params
    const tutorId = req.user.id

    // 1) Verify ownership
    const dbRes = await pool.query(
      'SELECT * FROM recorded_videos WHERE id = $1 AND tutor_id = $2',
      [id, tutorId]
    )
    if (dbRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Not found or unauthorized' })
    }
    const video = dbRes.rows[0]

    // 2) Collect Cloudinary public_ids
    const toDelete = []
    for (let field of ['video_url','preview_url','thumbnail_url']) {
      if (video[field]) {
        const pid = getPublicIdFromUrl(video[field])
        if (pid) toDelete.push(pid)
      }
    }
    // pdf_url left as-is (not managed by Cloudinary)

    // 3) Delete from Cloudinary
    await deleteFromCloudinary(toDelete, 'auto') // 'auto' covers image/video

    // 4) Remove DB row
    await pool.query('DELETE FROM recorded_videos WHERE id = $1', [id])

    res.status(200).json({
      success: true,
      message: 'Video and associated Cloudinary assets deleted.',
    })
  } catch (err) {
    console.error('deleteVideoById error:', err)
    res.status(500).json({ success: false, message: 'Server error deleting video' })
  }
}

/**
 * JSON-based update endpoint: patch any subset of fields.
 */
export const updateVideoJson = async (req, res) => {
  const { id } = req.params
  const tutorId = req.user.id

  try {
    // 1) validate update payload
    const { error, value } = classVaultUpdateValidationSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      })
    }

    // 2) ensure record exists & tutor owns it
    const sel = await pool.query(
      'SELECT 1 FROM recorded_videos WHERE id = $1 AND tutor_id = $2',
      [id, tutorId]
    )
    if (sel.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Video not found or unauthorized' })
    }

    // 3) build dynamic SET clause
    const fields = Object.keys(value)
    if (fields.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'No valid fields provided to update.' })
    }
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
    const vals = fields.map((f) => value[f])
    vals.push(id, tutorId)

    // 4) execute update
    const updateQuery = `
      UPDATE recorded_videos
      SET ${setClause}
      WHERE id = $${fields.length + 1} AND tutor_id = $${fields.length + 2}
      RETURNING *;
    `
    const updated = await pool.query(updateQuery, vals)

    res.json({ success: true, video: updated.rows[0] })
  } catch (err) {
    console.error('Error updating video:', err)
    res
      .status(500)
      .json({ success: false, message: 'Failed to update video', error: err.message })
  }
}

export const purchaseClass = async (req, res) => {
  const client = await pool.connect();
  try {
    const studentId = req.user.id;
    const videoId   = Number(req.params.id);

    await client.query('BEGIN');

    // 1) class info
    const { rows: classRows } = await client.query(
      `SELECT tutor_id, price, title, subject, grade_level
         FROM recorded_videos
        WHERE id = $1`,
      [videoId]
    );
    if (!classRows.length) {
      await client.query('ROLLBACK'); return res.status(404).json({ message: 'Class not found.' });
    }
    const { tutor_id: tutorId, price: grossTokens, title, subject, grade_level: gradeLevel } = classRows[0];

    // 2) already purchased?
    const { rows: existing } = await client.query(
      `SELECT 1 FROM classvault_purchases WHERE student_id = $1 AND class_id = $2`,
      [studentId, videoId]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      const { rows: resRows } = await pool.query(
        `SELECT video_url, pdf_url FROM recorded_videos WHERE id = $1`,
        [videoId]
      );
      return res.status(200).json({ message: 'Already purchased.', resources: resRows[0] });
    }

    // 3) student tokens check
    const { rows: userRows } = await client.query(
      `SELECT tokens, name FROM users WHERE id = $1`,
      [studentId]
    );
    if (!userRows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Student not found.' }); }
    const { tokens: studentTokens, name: studentName } = userRows[0];
    if (studentTokens < grossTokens) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Insufficient tokens. You need ${grossTokens - studentTokens} more.` });
    }

    // 4) deduct tokens & record purchase (gross in tokens)
    await client.query(
      `UPDATE users SET tokens = tokens - $1 WHERE id = $2`,
      [grossTokens, studentId]
    );

    // 5) figure tutor payout currency (from profile)
    const { rows: profRows } = await client.query(
      `SELECT payout_currency FROM profiles WHERE user_id = $1 AND role='tutor'`,
      [tutorId]
    );
    const payoutCurrency = (profRows[0]?.payout_currency || 'USD').toUpperCase();

    // 6) compute earnings
    const grossUsd = Number(grossTokens);               // 1 token = $1
    const feeUsd   = +(grossUsd * PLATFORM_FEE).toFixed(2);
    const netUsd   = +(grossUsd - feeUsd).toFixed(2);

    let creditedAmount = netUsd;
    let fxRateUsed = 1;
    if (payoutCurrency === 'KES') {
      fxRateUsed = await getFxRate('USD', 'KES');
      creditedAmount = +(netUsd * fxRateUsed).toFixed(2);
    }

    // 7) upsert balance
    await client.query(
      `INSERT INTO earnings_balances (user_id, currency, available_amount, pending_amount, updated_at)
       VALUES ($1,$2,$3,0,NOW())
       ON CONFLICT (user_id, currency)
       DO UPDATE SET
         available_amount = earnings_balances.available_amount + EXCLUDED.available_amount,
         updated_at = NOW()`,
      [tutorId, payoutCurrency, creditedAmount]
    );

    // 8) insert purchase row (net tokens kept for reference)
    const { rows: purchaseRows } = await client.query(
      `INSERT INTO classvault_purchases
         (class_id, student_id, tutor_id, amount, fee_tokens, gross_tokens, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       RETURNING *`,
      [
        videoId, studentId, tutorId,
        Math.round(netUsd),          // amount column kept as "net tokens" if you need
        Math.round(feeUsd),          // fee in tokens (USD)
        Math.round(grossUsd)
      ]
    );
    const purchase = purchaseRows[0];

    // 9) write a transactions row (what your UI shows)
    // Keep your existing style; include the FX used so you can audit later.
    const desc = `Class purchase "${title}" · gross ${grossUsd.toFixed(2)} USD (tokens ${grossTokens}), fee ${feeUsd.toFixed(2)} USD, accrued ${creditedAmount} ${payoutCurrency}${payoutCurrency==='KES' ? ` @ ${fxRateUsed} FX` : ''}`;
    await client.query(
      `INSERT INTO transactions
         (user_id, type, amount, description, date, status, currency, payment_method, created_at, updated_at)
       VALUES ($1, 'Completed Earnings', $2, $3, NOW(), 'Completed', $4, NULL, NOW(), NOW())`,
      [tutorId, creditedAmount, desc, payoutCurrency]
    );

    await client.query('COMMIT');

    // 10) notify tutor (optional)
    try {
      const { rows: tutorRows } = await pool.query(
        `SELECT email, name FROM users WHERE id = $1`,
        [tutorId]
      );
      if (tutorRows.length) {
        // ...sendNotification(...) like you had before...
      }
    } catch {}

    // 11) return resources
    const { rows: resRows2 } = await pool.query(
      `SELECT video_url, pdf_url FROM recorded_videos WHERE id = $1`,
      [videoId]
    );

    return res.status(201).json({
      message:   'Purchase successful! Earnings accrued.',
      purchase,
      resources: resRows2[0],
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('purchaseClass error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  } finally {
    client.release();
  }
};


// add this export near the bottom of the file
export const getPurchases = async (req, res) => {
  try {
    const studentId = req.user.id;

    const query = `
      SELECT
        cp.id            AS purchase_id,
        cp.class_id,
        cp.tutor_id,
        cp.amount        AS net_tokens,
        cp.created_at    AS purchased_at,
        rv.title,
        rv.subject,
        rv.grade_level,
        rv.video_url,
        rv.pdf_url
      FROM classvault_purchases cp
      JOIN recorded_videos rv
        ON cp.class_id = rv.id
      WHERE cp.student_id = $1
      ORDER BY cp.created_at DESC
    `;
    const { rows } = await pool.query(query, [studentId]);
    return res.json({ purchases: rows });
  } catch (err) {
    console.error('getPurchases error:', err);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch purchases.' });
  }
};
