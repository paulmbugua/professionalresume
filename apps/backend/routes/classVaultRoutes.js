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
  purchaseClass,
  getPurchases,
} from '../controllers/classVaultController.js'
import { uploadSingleFile } from '../controllers/profileController.js'

const router = express.Router()

// Public
router.get('/', getAllVideos)

// Student-only: list your purchases
router.get('/purchases', authUser, getPurchases)

// Student-only: download if you’ve purchased
router.get('/download/:videoId(\\d+)', authUser, downloadPdfOrVideo)

// Public
router.get('/:videoId(\\d+)/reviews', getReviews)
router.get('/:id(\\d+)', getVideoById)

// Tutor/student write actions
router.post('/',               authUser, express.json(), createVideoJson)
router.post(
  '/upload/:type(video|pdf|preview|thumbnail)',
  authUser,
  upload.single('file'),
  uploadSingleFile
)
router.post('/:id(\\d+)/purchase', authUser, express.json(), purchaseClass)
router.put('/:id(\\d+)',          authUser, express.json(), updateVideoJson)
router.delete('/:id(\\d+)',       authUser, deleteVideoById)

export default router
