import { getCvExportEntitlement } from '../services/cvPaymentService.js';

export async function requireCvExportEntitlement(req, res, next) {
  try {
    const entitlement = await getCvExportEntitlement(req.user.id);
    if (!entitlement.eligible) {
      return res.status(403).json({
        error: 'Resume export/print requires a one-time payment unlock (Paystack card: KES 130, M-Pesa STK: KES 100).',
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
