import crypto from 'crypto';
import { cvTemplates } from '../services/cvTemplates.js';
import { getDbStatus } from '../config/db.js';
import {
  listDraftsForUser,
  getDraftById,
  createDraft,
  saveDraft,
} from '../services/cvStorage.js';
import { createDraftSchema, draftPatchSchema } from '../validators/cvValidators.js';

const defaultSectionOrder = [
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'extras',
];

const defaultSectionVisibility = defaultSectionOrder.reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {});

const buildDefaultDraft = ({ userId, templateId, title }) => ({
  id: crypto.randomUUID(),
  userId: String(userId),
  title: title?.trim() || 'Untitled CV',
  templateId,
  updatedAt: new Date().toISOString(),
  basics: {
    name: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    links: [],
  },
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  extras: { languages: [], interests: [] },
  sectionOrder: defaultSectionOrder,
  sectionVisibility: defaultSectionVisibility,
});

export async function listTemplates(_req, res) {
  const db = getDbStatus();
  res.json({
    templates: cvTemplates,
    source: db.ready ? 'db' : 'local',
    fallback: !db.ready,
  });
}

export async function listDrafts(req, res) {
  try {
    const userId = req.user?.id;
    const drafts = await listDraftsForUser(userId);
    res.json(drafts);
  } catch (err) {
    console.error('listDrafts error', err);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
}

export async function getDraft(req, res) {
  try {
    const userId = req.user?.id;
    const draft = await getDraftById(req.params.id);
    if (!draft || String(draft.userId) !== String(userId)) {
      return res.status(404).json({ error: 'Draft not found' });
    }
    res.json(draft);
  } catch (err) {
    console.error('getDraft error', err);
    res.status(500).json({ error: 'Failed to fetch draft' });
  }
}

export async function createDraftHandler(req, res) {
  try {
    const { error, value } = createDraftSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }

    const templateId = value.templateId;
    const exists = cvTemplates.some((template) => template.id === templateId);
    if (!exists) {
      return res.status(400).json({ error: 'Invalid templateId' });
    }

    const draft = buildDefaultDraft({
      userId: req.user?.id,
      templateId,
      title: value.title,
    });
    const created = await createDraft(draft);
    res.status(201).json(created);
  } catch (err) {
    console.error('createDraft error', err);
    res.status(500).json({ error: 'Failed to create draft' });
  }
}

export async function updateDraft(req, res) {
  try {
    const { error, value } = draftPatchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details?.[0]?.message || error.message });
    }

    const userId = req.user?.id;
    const draft = await getDraftById(req.params.id);
    if (!draft || String(draft.userId) !== String(userId)) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const updated = {
      ...draft,
      ...value,
      basics: { ...draft.basics, ...value.basics },
      extras: { ...draft.extras, ...value.extras },
      sectionVisibility: {
        ...draft.sectionVisibility,
        ...value.sectionVisibility,
      },
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveDraft(updated);
    res.json(saved);
  } catch (err) {
    console.error('updateDraft error', err);
    res.status(500).json({ error: 'Failed to update draft' });
  }
}
