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
import deleteLocalFile from '../utils/deleteLocalFile.js'
import pool from '../config/db.js'
import {
  classVaultValidationSchema,
  classVaultUpdateValidationSchema,
} from '../validators/classVaultValidator.js'

// point fluent-ffmpeg at the installed binary
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

/**
 * Generate a single-frame thumbnail 1 second into the video.
 */
function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(outputPath),
        folder:   path.dirname(outputPath),
        size:     '320x240',
      })
      .on('end', resolve)
      .on('error', reject)
  })
}

/**
 * Create a short preview clip from the start of the video.
 */
function generatePreview(inputPath, outputPath, duration = 10) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(['-ss 0'])
      .duration(duration)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run()
  })
}

/**
 * JSON-based two-step endpoint:
 * 1) expects video_url (and optional pdf_url) in req.body
 * 2) downloads the video, auto-generates thumbnail & preview,
 * 3) uploads all three files, then writes URLs into the DB.
 */
export const createVideoJson = async (req, res) => {
  try {
    // 1) validate incoming metadata
    const { error, value } = classVaultValidationSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      })
    }
    const {
      title,
      description,
      subject,
      grade_level,
      price,
      duration,
      tags,
      video_url,
      pdf_url,
    } = value
    const tutor_id = req.user.id

    // 2) download the remote video to a temp file
    const tmpVideo = path.join(os.tmpdir(), `${uuid()}.mp4`)
    const resp = await fetch(video_url)
    if (!resp.ok) throw new Error('Failed to download video')
    await new Promise((resolve, reject) => {
      const ws = createWriteStream(tmpVideo)
      resp.body.pipe(ws)
      resp.body.on('error', reject)
      ws.on('finish', resolve)
    })

    // 3) generate thumbnail + preview locally
    const thumbLocal   = path.join(os.tmpdir(), `${uuid()}.jpg`)
    const previewLocal = path.join(os.tmpdir(), `${uuid()}.mp4`)
    await generateThumbnail(tmpVideo, thumbLocal)
    await generatePreview(tmpVideo, previewLocal, 10)

    // 4) upload those derivatives
    const [thumbUpload]   = await uploadToLocal([{ path: thumbLocal }])
    const [previewUpload] = await uploadToLocal([{ path: previewLocal }])
    const thumbnail_url = thumbUpload.url
    const preview_url   = previewUpload.url

    // 5) clean up temp files
    await Promise.all([
      fs.unlink(tmpVideo),
      fs.unlink(thumbLocal),
      fs.unlink(previewLocal),
    ])

    // 6) insert record into the database
    const insertQuery = `
      INSERT INTO recorded_videos
        (tutor_id, title, description, subject, grade_level,
         price, duration, tags, video_url, pdf_url, preview_url, thumbnail_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
    `
    const result = await pool.query(insertQuery, [
      tutor_id,
      title,
      description,
      subject,
      grade_level,
      price,
      duration,
      tags,
      video_url,
      pdf_url,
      preview_url,
      thumbnail_url,
    ])

    return res.status(201).json({ success: true, video: result.rows[0] })
  } catch (err) {
    console.error('Error in createVideoJson:', err)
    return res
      .status(500)
      .json({ success: false, message: 'Failed to create video', error: err.message })
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
