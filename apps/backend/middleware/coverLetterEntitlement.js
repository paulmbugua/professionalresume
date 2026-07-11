import { getCoverLetterExportEntitlement } from '../services/cvPaymentService.js';

export async function requireCoverLetterEntitlement(req, res, next) {
  try {
    const entitlement = await getCoverLetterExportEntitlement(req.user.id);
    if (!entitlement.eligible) {
      return res.status(403).json({
        error: 'Cover letter export/print requires Ksh 100 monthly M-Pesa access.',
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
