// apps/backend/routes/orgRoutes.js
import express from 'express';
import requireAuth from '../middleware/auth.js';
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
} from '../controllers/orgController.js';

const router = express.Router();

// mine + usage
router.get('/mine', requireAuth, getMyOrg);
router.get('/:orgId/usage', requireAuth, getOrgUsage);

// branding / assignments / invites / analytics
router.put('/:orgId/branding', requireAuth, updateOrgBranding);
router.post('/:orgId/assignments', requireAuth, createAssignment);
router.get('/invite/:code', resolveInvite);
router.post('/accept', requireAuth, acceptInvite);
router.post('/attempts:submit', requireAuth, submitAttempt); // if you expose it
router.get('/:orgId/analytics', requireAuth, orgAnalytics);

// (optional) simple upgrade + report stubs if your UI calls them
router.post('/:orgId/upgrade', requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const { tier } = req.body || {};
  if (!['starter','pro','enterprise'].includes(tier)) {
    return res.status(400).json({ message: 'Invalid tier' });
  }
  await req.app.get('pool')?.query?.('DO $$ BEGIN END $$;').catch(()=>{});
  res.json({ tier, seats: tier==='starter'?50:tier==='pro'?500:5000 });
});
router.post('/:orgId/reports:test-send', requireAuth, (_req,res)=>res.json({ok:true}));
router.post('/:orgId/reports:send', requireAuth, (_req,res)=>res.json({ok:true}));

export default router;
