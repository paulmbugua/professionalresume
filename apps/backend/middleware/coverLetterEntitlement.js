import { getCoverLetterEntitlement } from '../services/cvService.js';

export async function requireCoverLetterEntitlement(req, res, next) {
  try {
    const entitlement = await getCoverLetterEntitlement(req.user.id);
    if (!entitlement.eligible) {
      return res.status(402).json({
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

