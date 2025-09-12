// apps/backend/routes/orgRoutes.js
import express from 'express';
import requireAuth from '../middleware/auth.js';
import { initOrgSubscription, confirmOrgSubscription } from '../controllers/orgBillingController.js';
import {
  createOrg,
  updateOrgBranding,
  createAssignment,
  resolveInvite,
  acceptInvite,
  submitAttempt,
  orgAnalytics,
  getMyOrg,
  getOrgUsage,
  bootstrapMyOrg,
  ensureShareableAssignment,

  getAttemptMeta,
  getMyAttemptForAssignment,
  startAttempt, // ⬅️ added
} from '../controllers/orgController.js';

const router = express.Router();

// mine + usage
router.get('/mine', requireAuth, getMyOrg);
router.get('/:orgId/usage', requireAuth, getOrgUsage);

// assignment/attempt read APIs (must come before any "/:orgId/..." param routes)
router.get('/attempts/:attemptId/meta', requireAuth, getAttemptMeta);
router.get('/assignments/:assignmentId/mine', requireAuth, getMyAttemptForAssignment);

// branding / assignments / invites / analytics
router.put('/:orgId/branding', requireAuth, updateOrgBranding);

// keep legacy create endpoint but now it's idempotent (UPSERT)
router.post('/:orgId/assignments', requireAuth, createAssignment);

// idempotent “one-button share”
router.post('/:orgId/share', requireAuth, ensureShareableAssignment);

router.get('/invite/:code', resolveInvite);
router.post('/accept', requireAuth, acceptInvite);

// start attempt (aliases for safety)

router.post('/attempts/start', requireAuth, startAttempt);  // ⬅️ added

// submit attempt (support both spellings for safety)
router.post('/attempt/submit', requireAuth, submitAttempt);
router.post('/attempts/submit', requireAuth, submitAttempt);

router.get('/:orgId/analytics', requireAuth, orgAnalytics);

// bootstrap + billing
router.post('/bootstrap', requireAuth, bootstrapMyOrg);
router.post('/:orgId/subscribe/init', requireAuth, initOrgSubscription);
router.post('/subscriptions/:paymentId/confirm', requireAuth, confirmOrgSubscription);

// optional stubs
router.post('/:orgId/upgrade', requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const { tier } = req.body || {};
  if (!['starter', 'pro', 'enterprise'].includes(tier)) {
    return res.status(400).json({ message: 'Invalid tier' });
  }
  await req.app.get('pool')?.query?.('DO $$ BEGIN END $$;').catch(() => {});
  res.json({ tier, seats: tier === 'starter' ? 50 : tier === 'pro' ? 500 : 5000 });
});
router.post('/:orgId/reports/test-send', requireAuth, (_req, res) => res.json({ ok: true }));
router.post('/:orgId/reports/send', requireAuth, (_req, res) => res.json({ ok: true }));

export default router;
