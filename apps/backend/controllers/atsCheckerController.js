import Joi from 'joi';
import { analyzeAtsUpload } from '../services/atsCheckerService.js';

const atsCheckSchema = Joi.object({
  resumeText: Joi.string().allow('').max(120000).default(''),
  jobDescription: Joi.string().allow('').max(20000).default(''),
  targetRole: Joi.string().allow('').max(300).default(''),
});

export async function checkAtsResume(req, res) {
  try {
    const { value, error } = atsCheckSchema.validate(req.body || {}, {
      abortEarly: true,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        ok: false,
        code: 'ATS_VALIDATION_ERROR',
        error: error.details?.[0]?.message || error.message,
      });
    }

    const report = await analyzeAtsUpload({
      file: req.file,
      resumeText: value.resumeText,
      jobDescription: value.jobDescription,
      targetRole: value.targetRole,
    });

    return res.json({
      ok: true,
      report,
    });
  } catch (err) {
    const status = Number(err?.statusCode || 500);
    if (status >= 500) {
      console.error('[ats-checker] check failed', err);
    }
    return res.status(status).json({
      ok: false,
      code: status >= 500 ? 'ATS_CHECK_ERROR' : 'ATS_INPUT_ERROR',
      error: err?.message || 'Failed to check resume ATS fit.',
    });
  }
}
