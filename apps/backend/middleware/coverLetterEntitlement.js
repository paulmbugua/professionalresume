import { getCvExportEntitlement } from '../services/cvPaymentService.js';

export async function requireCoverLetterEntitlement(req, res, next) {
  try {
    const entitlement = await getCvExportEntitlement(req.user.id);
    if (!entitlement.eligible) {
      return res.status(403).json({
        error: 'Cover letter export/print requires the one-time CV export unlock payment (Paystack card: KES 130, M-Pesa STK: KES 100).',
        entitlement,
      });
    }
    req.coverLetterEntitlement = entitlement;
    return next();
  } catch (error) {
    console.error('requireCoverLetterEntitlement error', error);
    return res.status(500).json({ error: 'Failed to verify cover letter entitlement' });
  }
}
