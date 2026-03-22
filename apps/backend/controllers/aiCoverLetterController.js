import {
  aiCoverLetterGenerateSchema,
  aiCoverLetterRewriteSchema,
  aiCoverLetterParagraphSchema,
  aiCoverLetterSubjectSchema,
  aiCoverLetterGreetingClosingSchema,
} from '../validators/cvValidators.js';
import {
  generateCoverLetter,
  rewriteCoverLetterStyle,
  improveCoverLetterParagraph,
  suggestCoverLetterSubjectLines,
  suggestCoverLetterGreetingClosing,
} from '../services/aiCoverLetterService.js';

function validationError(res, error) {
  return res.status(400).json({ error: error.details?.[0]?.message || error.message });
}

export async function aiCoverLetterGenerate(req, res) {
  try {
    const { error, value } = aiCoverLetterGenerateSchema.validate(req.body || {});
    if (error) return validationError(res, error);
    const suggestion = await generateCoverLetter(value);
    return res.json({ suggestion });
  } catch (err) {
    console.error('aiCoverLetterGenerate error', err);
    return res.status(500).json({ error: 'Failed to generate cover letter' });
  }
}

export async function aiCoverLetterRewrite(req, res) {
  try {
    const { error, value } = aiCoverLetterRewriteSchema.validate(req.body || {});
    if (error) return validationError(res, error);
    const suggestion = await rewriteCoverLetterStyle(value);
    return res.json({ suggestion });
  } catch (err) {
    console.error('aiCoverLetterRewrite error', err);
    return res.status(500).json({ error: 'Failed to rewrite cover letter' });
  }
}

export async function aiCoverLetterImproveParagraph(req, res) {
  try {
    const { error, value } = aiCoverLetterParagraphSchema.validate(req.body || {});
    if (error) return validationError(res, error);
    const suggestion = await improveCoverLetterParagraph(value);
    return res.json({ suggestion });
  } catch (err) {
    console.error('aiCoverLetterImproveParagraph error', err);
    return res.status(500).json({ error: 'Failed to improve paragraph' });
  }
}

export async function aiCoverLetterSubject(req, res) {
  try {
    const { error, value } = aiCoverLetterSubjectSchema.validate(req.body || {});
    if (error) return validationError(res, error);
    const suggestions = await suggestCoverLetterSubjectLines(value);
    return res.json({ suggestions });
  } catch (err) {
    console.error('aiCoverLetterSubject error', err);
    return res.status(500).json({ error: 'Failed to suggest subject lines' });
  }
}

export async function aiCoverLetterGreetingClosing(req, res) {
  try {
    const { error, value } = aiCoverLetterGreetingClosingSchema.validate(req.body || {});
    if (error) return validationError(res, error);
    const suggestions = await suggestCoverLetterGreetingClosing(value);
    return res.json({ suggestions });
  } catch (err) {
    console.error('aiCoverLetterGreetingClosing error', err);
    return res.status(500).json({ error: 'Failed to suggest greetings and closings' });
  }
}
