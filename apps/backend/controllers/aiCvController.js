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
import { retrieveTextSources } from '../services/aiLabRagService.js';

async function grounding(query, sources) {
  try { return await retrieveTextSources({ query, sources }); }
  catch (error) { console.warn('[ai-cv] grounding skipped', error?.message || error); return []; }
}

export async function aiSummary(req, res) {
  try {
    const { error, value } = aiSummarySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }
    const passages = await grounding('professional summary and CV evidence', [{ filename: 'CV draft', text: JSON.stringify(value.draft) }]);
    const suggestion = await generateSummary(value.draft, passages);
    res.json({ suggestion, grounding: { sourceCount: passages.length } });
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
    const passages = await grounding(value.bullet, [{ filename: 'CV context', text: value.context }]);
    const suggestion = await rewriteBullet(value.context, value.bullet, passages);
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
    const passages = await grounding('ATS skills for this CV', [{ filename: 'CV draft', text: JSON.stringify(value.draft) }]);
    const suggestions = await suggestSkills(value.draft, passages);
    res.json({ suggestions, grounding: { sourceCount: passages.length } });
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
    const passages = await grounding(value.jobAdvertText, [{ filename: 'CV draft', text: JSON.stringify(value.draft) }, { filename: 'Job advert', text: value.jobAdvertText }]);
    const result = await jobRequirementAssist({ ...value, grounding: passages });
    res.json(result);
  } catch (err) {
    console.error('aiJobRequirement error', err);
    res.status(500).json({ error: 'Failed to analyze job requirements' });
  }
}
