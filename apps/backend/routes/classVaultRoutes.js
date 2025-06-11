// apps/backend/routes/classVaultRoutes.js

import express from 'express'
import authUser from '../middleware/authUser.js'
import upload from '../middleware/multer.js'

import {
  getAllVideos,
  getVideoById,
  getReviews,
  createVideoJson,
  deleteVideoById,
  downloadPdfOrVideo,
  updateVideoJson,
} from '../controllers/classVaultController.js'

import { uploadSingleFile } from '../controllers/profileController.js'

const router = express.Router()

// ── Public reads ────────────────────────────────────────────────────────────────
// GET   /classvault           → list all videos
router.get('/', getAllVideos)

// GET   /classvault/:id       → get one video’s metadata
router.get('/:id', getVideoById)

// GET   /classvault/:videoId/reviews
router.get('/:videoId/reviews', getReviews)


// ── Protected routes ──────────────────────────────────────────────────────────
// GET   /classvault/download/:videoId  → stream video/pdf if purchased
router.get('/download/:videoId', authUser, downloadPdfOrVideo)


// POST  /classvault           → create metadata (2-step flow)
//    body: { title, subject, grade_level, price, duration, tags, video_url, pdf_url }
router.post('/', authUser, express.json(), createVideoJson)


// POST  /classvault/upload/:type
//    single-file upload (type ∈ [video, pdf, preview, thumbnail])
router.post(
  '/upload/:type',
  authUser,
  upload.single('file'),
  uploadSingleFile
)


// PUT   /classvault/:id       → update metadata fields
router.put('/:id', authUser, express.json(), updateVideoJson)


// DELETE /classvault/:id      → delete video + all associated files
router.delete('/:id', authUser, deleteVideoById)


export default router
