// apps/backend/routes/youtubeIngestRoutes.js
import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import { ingestYouTube } from '../controllers/youtubeIngestController.js';

const router = Router();

// POST /api/oer/ingest/youtube
router.post('/oer/ingest/youtube', adminAuth, ingestYouTube);

// Health check (optional)
router.get('/oer/ingest/youtube/health', (req, res) => {
  res.json({ ok: true, route: 'youtube ingest' });
});

export default router;
