// apps/backend/controllers/classVaultController.js

import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import path from 'path'
import os from 'os'
import fetch from 'node-fetch'
import { v4 as uuid } from 'uuid'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import uploadToLocal from '../utils/uploadToLocal.js'
import pool from '../config/db.js'
import {
  classVaultValidationSchema,
} from '../validators/classVaultValidator.js'

import { sendNotification } from '../utils/sendNotification.js';



ffmpeg.setFfmpegPath(ffmpegInstaller.path)

// Normalize backslashes to forward slashes
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
        filename: path.basename(outputPath),
        folder:   path.dirname(outputPath),
        size:     '320x240',
      })
      .on('stderr', (line) => { stderr += line + '\n' })
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('FFmpeg thumbnail error:', stderr, err)
        reject(new Error(`Thumbnail generation failed: ${err.message}`))
      })
  })
}

function generatePreview(inputPath, outputPath, duration = 10) {
  return new Promise((resolve, reject) => {
    let stderr = ''
    ffmpeg()
      .input(normalizePath(inputPath))
      .seekInput(0)                              // start at 0s
      .outputOptions([`-t ${duration}`, '-c copy']) // cut duration, copy codec
      .output(normalizePath(outputPath))
      .on('stderr', (line) => { stderr += line + '\n' })
      .on('end', resolve)
      .on('error', (err) => {
        console.error('FFmpeg preview error:', stderr, err)
        reject(new Error(`Preview generation failed: ${err.message}`))
      })
      .run()
  })
}


export const createVideoJson = async (req, res) => {
  try {
    const { error, value } = classVaultValidationSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message })
    }

    const { title, description, subject, grade_level, price, duration, tags, video_url, pdf_url } = value
    const tutor_id = req.user.id

    // Helper to build download URLs
    const makeAbsolute = (url) => /^https?:\/\//.test(url)
      ? url
      : `${req.protocol}://${req.get('host')}${url}`
    const downloadVideoUrl = makeAbsolute(video_url)

    // Download video
    const tmpVideo = path.join(os.tmpdir(), `${uuid()}.mp4`)
    console.log('Downloading video to:', tmpVideo)
    const resp = await fetch(downloadVideoUrl)
    if (!resp.ok) throw new Error('Failed to download video')
    await new Promise((resolve, reject) => {
      const ws = createWriteStream(tmpVideo)
      resp.body.pipe(ws)
      resp.body.on('error', reject)
      ws.on('finish', resolve)
    })
    console.log('✔️ tmpVideo saved')

    // Generate thumbnail & preview
    const thumbLocal   = path.join(os.tmpdir(), `${uuid()}.jpg`)
    const previewLocal = path.join(os.tmpdir(), `${uuid()}.mp4`)

    console.log('Generating thumbnail…')
    await generateThumbnail(tmpVideo, thumbLocal)
    console.log('✔️ Thumbnail generated at', thumbLocal)

    console.log('Generating preview…')
    await generatePreview(tmpVideo, previewLocal, 10)
    console.log('✔️ Preview generated at', previewLocal)

    // Upload derivatives
    const thumbBuffer   = await fs.readFile(thumbLocal)
    const previewBuffer = await fs.readFile(previewLocal)
    const [thumbUpload]   = await uploadToLocal([{ path: thumbLocal, buffer: thumbBuffer }])
    const [previewUpload] = await uploadToLocal([{ path: previewLocal, buffer: previewBuffer }])

    const thumbnail_url = thumbUpload.url
    const preview_url   = previewUpload.url

    // Cleanup
    await Promise.all([
      fs.unlink(tmpVideo),
      fs.unlink(thumbLocal),
      fs.unlink(previewLocal),
    ])

    // Insert into DB
    const insertQuery = `
      INSERT INTO recorded_videos
        (tutor_id, title, description, subject, grade_level,
         price, duration, tags, video_url, pdf_url, preview_url, thumbnail_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
    `
    const result = await pool.query(insertQuery, [
      tutor_id, title, description, subject, grade_level,
      price, duration, tags, video_url, pdf_url,
      preview_url, thumbnail_url,
    ])

    return res.status(201).json({ success: true, video: result.rows[0] })
  } catch (err) {
    console.error('Error in createVideoJson:', err)
    return res.status(500).json({ success: false, message: 'Failed to create video', error: err.message })
  }
}

/**
 * Secure download endpoint: only students who purchased may fetch URLs.
 */
export const downloadPdfOrVideo = async (req, res) => {
  const { videoId } = req.params
  const studentId = req.user.id

  const access = await pool.query(
    'SELECT 1 FROM purchases WHERE student_id = $1 AND video_id = $2',
    [studentId, videoId]
  )
  if (access.rows.length === 0) {
    return res.status(403).json({ message: 'Access denied. Please purchase the class.' })
  }

  const result = await pool.query(
    'SELECT pdf_url, video_url FROM recorded_videos WHERE id = $1',
    [videoId]
  )
  res.json(result.rows[0])
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

/** Fetch reviews for a particular video */
export const getReviews = async (req, res) => {
  const { videoId } = req.params
  const result = await pool.query(
    'SELECT * FROM video_reviews WHERE video_id = $1',
    [videoId]
  )
  res.json(result.rows)
}

/** Delete a video and all its files (video/pdf/thumbnail/preview) */
export const deleteVideoById = async (req, res) => {
  try {
    const { id } = req.params
    const tutorId = req.user.id

    // ensure the tutor owns this video
    const dbRes = await pool.query(
      'SELECT * FROM recorded_videos WHERE id = $1 AND tutor_id = $2',
      [id, tutorId]
    )
    if (dbRes.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: 'Video not found or unauthorized' })
    }

    const video = dbRes.rows[0]
    const filesToDelete = [
      video.video_url,
      video.pdf_url,
      video.preview_url,
      video.thumbnail_url,
    ].filter(Boolean)

    // delete from storage
    await Promise.all(filesToDelete.map(deleteLocalFile))

    // delete DB row
    await pool.query('DELETE FROM recorded_videos WHERE id = $1', [id])

    res.status(200).json({
      success: true,
      message: 'Video and associated files deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting video:', error)
    res
      .status(500)
      .json({ success: false, message: 'Server error deleting video' })
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
  try {
    // ——— 1) Parse + validate the route param ———
    const videoId = Number(req.params.id)
    if (!Number.isInteger(videoId) || videoId <= 0) {
      return res.status(400).json({ message: 'Invalid class ID.' })
    }
    const studentId = req.user.id

    // ——— 2) Prevent duplicate purchases ———
    const dup = await pool.query(
      `SELECT 1
         FROM classvault_purchases
        WHERE student_id = $1
          AND class_id   = $2`,
      [studentId, videoId]
    )
    if (dup.rows.length) {
      return res.status(400).json({ message: 'You have already purchased this class.' })
    }

    // ——— 3) Load class metadata in one go ———
    const cls = await pool.query(
      `SELECT tutor_id, price, title, video_url, pdf_url
         FROM recorded_videos
        WHERE id = $1`,
      [videoId]
    )
    if (!cls.rows.length) {
      return res.status(404).json({ message: 'Class not found.' })
    }
    const { tutor_id: tutorId, price, title, video_url, pdf_url } = cls.rows[0]

    // ——— 4) Check student token balance ———
    const user = await pool.query(
      `SELECT tokens, name
         FROM users
        WHERE id = $1`,
      [studentId]
    )
    if (!user.rows.length) {
      return res.status(404).json({ message: 'User not found.' })
    }
    const { tokens: studentTokens, name: studentName } = user.rows[0]
    if (studentTokens < price) {
      return res
        .status(400)
        .json({ message: `Insufficient tokens. You need ${price - studentTokens} more.` })
    }

    // ——— 5) Deduct tokens & record the purchase ———
    await pool.query(
      `UPDATE users SET tokens = tokens - $1 WHERE id = $2`,
      [price, studentId]
    )
    await pool.query(
      `INSERT INTO classvault_purchases
         (class_id, student_id, tutor_id, amount, created_at)
       VALUES ($1,$2,$3,$4,NOW())`,
      [videoId, studentId, tutorId, price]
    )

    // ——— 6) Notify the tutor ———
    const tutor = await pool.query(
      `SELECT email, name
         FROM users
        WHERE id = $1`,
      [tutorId]
    )
    if (tutor.rows.length) {
      await sendNotification({
        to: tutor.rows[0].email,
        subject: 'Your ClassVault content was purchased',
        body: `Hi ${tutor.rows[0].name},\n\n` +
              `${studentName} just purchased your class “${title}”.\n\n` +
              `Cheers,\nYour App`,
      })
    }

    // ——— 7) Return the URLs so client can unlock immediately ———
    return res.status(201).json({ video_url, pdf_url })
  } catch (err) {
    console.error('purchaseClass error:', err)
    return res.status(500).json({ message: 'Internal server error.' })
  }
}