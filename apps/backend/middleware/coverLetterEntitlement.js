import { getCoverLetterEntitlement } from '../services/cvService.js';

export async function requireCoverLetterEntitlement(req, res, next) {
  try {
    const entitlement = await getCoverLetterEntitlement(req.user.id);
    console.info('[coverLetter.entitlement] result', {
      userId: req.user?.id,
      eligible: entitlement?.eligible,
      reason: entitlement?.reason,
    });
    if (!entitlement.eligible) {
      return res.status(403).json({
        error: 'Cover letter access requires a paid resume purchase.',
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
