import {
  aiSummarySchema,
  aiRewriteSchema,
  aiSuggestSkillsSchema,
  aiJobRequirementAssistSchema,
} from '../validators/cvValidators.js';
import {
  generateSummary,
  jobRequirementAssist,
  rewriteBullet,
  suggestSkills,
} from '../services/aiCvService.js';

export async function aiSummary(req, res) {
  try {
    const { error, value } = aiSummarySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    const suggestion = await generateSummary(value.draft);
    res.json({ suggestion });
  } catch (err) {
    console.error('aiSummary error', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
}

export async function aiRewrite(req, res) {
  try {
    const { error, value } = aiRewriteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    const suggestion = await rewriteBullet(value.context, value.bullet);
    res.json({ suggestion });
  } catch (err) {
    console.error('aiRewrite error', err);
    res.status(500).json({ error: 'Failed to rewrite bullet' });
  }
}

export async function aiSkills(req, res) {
  try {
    const { error, value } = aiSuggestSkillsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    const suggestions = await suggestSkills(value.draft);
    res.json({ suggestions });
  } catch (err) {
    console.error('aiSkills error', err);
    res.status(500).json({ error: 'Failed to suggest skills' });
  }
}

export async function aiJobRequirement(req, res) {
  try {
    const { error, value } = aiJobRequirementAssistSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    const result = await jobRequirementAssist(value);
    res.json(result);
  } catch (err) {
    console.error('aiJobRequirement error', err);
    res.status(500).json({ error: 'Failed to analyze job requirements' });
  }
}
