import express from 'express';
import {
  createOrg,
  updateOrgBranding,
  createAssignment,
  resolveInvite,
  acceptInvite,
  submitAttempt,
  orgAnalytics,
  getMyOrg,        // ⬅️ new
  getOrgUsage,     // ⬅️ new
} from '../controllers/orgController.js';

const router = express.Router();

// Minimal auth guard (use your existing middleware if you have one)
const requireAuth = (req, res, next) => {
  if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
  next();
};

// mine + usage
router.get('/orgs/mine', requireAuth, getMyOrg);
router.get('/orgs/:orgId/usage', requireAuth, getOrgUsage);

// branding / assignments / invites / analytics
router.put('/orgs/:orgId/branding', requireAuth, updateOrgBranding);
router.post('/orgs/:orgId/assignments', requireAuth, createAssignment);
router.get('/orgs/invite/:code', resolveInvite);
router.post('/orgs/accept', requireAuth, acceptInvite);
router.post('/orgs/attempts:submit', requireAuth, submitAttempt); // if you expose it
router.get('/orgs/:orgId/analytics', requireAuth, orgAnalytics);

// (optional) simple upgrade + report stubs if your UI calls them
router.post('/orgs/:orgId/upgrade', requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const { tier } = req.body || {};
  if (!['starter','pro','enterprise'].includes(tier)) {
    return res.status(400).json({ message: 'Invalid tier' });
  }
  await req.app.get('pool')?.query?.('DO $$ BEGIN END $$;').catch(()=>{});
  // real impl could upsert org_subscriptions. For now just echo.
  res.json({ tier, seats: tier==='starter'?50:tier==='pro'?500:5000 });
});
router.post('/orgs/:orgId/reports:test-send', requireAuth, (_req,res)=>res.json({ok:true}));
router.post('/orgs/:orgId/reports:send', requireAuth, (_req,res)=>res.json({ok:true}));

export default router;
