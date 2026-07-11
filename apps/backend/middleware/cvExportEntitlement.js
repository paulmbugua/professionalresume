import { getResumeExportEntitlement } from '../services/cvPaymentService.js';

export async function requireCvExportEntitlement(req, res, next) {
  try {
    const entitlement = await getResumeExportEntitlement(req.user.id);
    if (!entitlement.eligible) {
      return res.status(403).json({
        error: 'Resume export/print requires Ksh 100 monthly M-Pesa access.',
        entitlement,
      });
    }
    req.cvExportEntitlement = entitlement;
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify CV export entitlement' });
  }
}

export default requireCvExportEntitlement;
