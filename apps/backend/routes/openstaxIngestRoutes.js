// apps/backend/routes/openstaxIngestRoutes.js
import { Router } from 'express';
import { ingestOpenStax } from '../controllers/openstaxIngestController.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router = Router();

// POST /api/oer/ingest/openstax
router.post('/oer/ingest/openstax', adminAuth, ingestOpenStax);

// Optional: quick health check to verify the route is mounted
router.get('/oer/ingest/health', (req, res) => {
  res.json({ ok: true, route: 'openstax ingest' });
});

export default router;
