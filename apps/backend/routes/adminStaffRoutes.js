import { Router } from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createStaff } from '../controllers/sessionController.js';

const router = Router();

// Superadmin-only: create staff/admin users
// POST /api/admin/staff  { email, name?, role: 'admin'|'tutor'|'student'|'superadmin', tempPassword? }
router.post('/staff', adminAuth, requireRole('superadmin'), createStaff);

export default router;
