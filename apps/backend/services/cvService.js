import pool from '../config/db.js';
import {
  createOwnedDraft,
  listOwnedDrafts,
  getOwnedDraft,
  updateOwnedDraft,
  softDeleteOwnedDraft,
} from './userOwnedDraftsService.js';

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

export function buildDefaultDraft({ userId, templateId, title }) {
  return {
    title: title?.trim() || 'Untitled CV',
    templateId,
    updatedAt: new Date().toISOString(),
    basics: { name: '', headline: '', email: '', phone: '', location: '', links: [] },
    summary: '',
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    extras: { languages: [], interests: [] },
    typography: {
      baseFontSize: 12,
      h1Size: 28,
      h2Size: 13,
      h3Size: 11,
      bodySize: 12,
      lineHeight: 1.48,
      fontFamily: 'Inter, system-ui, Arial',
    },
    formatting: { textColor: '#0f172a', mutedTextColor: '#475569', linkColor: '#0f766e' },
    templateTheme: { primary: '#0f172a', accent: '#0f766e' },
    richText: {},
    coverLetter: { subject: '', greeting: '', body: '', closing: '' },
    aiMeta: {},
    generationMeta: {},
    sectionOrder: defaultSectionOrder,
    sectionVisibility: defaultSectionVisibility,
    userId: String(userId),
  };
}

export async function listTemplatesFromDb() {
  const { rows } = await pool.query(
    `SELECT key AS id, name, description, preview_url AS "previewImage", is_active AS "isActive"
     FROM cv_templates
     WHERE is_active = TRUE
     ORDER BY name ASC`,
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    category: 'CVPro',
    isAtsFriendly: true,
    previewImage: r.previewImage || undefined,
    componentKey: r.id,
    isActive: r.isActive,
  }));
}

export async function templateExists(templateKey) {
  const { rows } = await pool.query('SELECT key FROM cv_templates WHERE key=$1 AND is_active=TRUE', [
    templateKey,
  ]);
  return rows.length > 0;
}

export async function createDraftForUser(userId, payload) {
  const normalized =
    payload.data ||
    buildDefaultDraft({ userId, templateId: payload.templateId, title: payload.title });

  return createOwnedDraft({
    table: 'cv_drafts',
    userId,
    title: payload.title?.trim() || 'Untitled CV',
    templateId: payload.templateId,
    data: normalized,
  });
}

export async function listDraftsForUser(userId) {
  return listOwnedDrafts({ table: 'cv_drafts', userId });
}

export async function getDraftForUser(userId, draftId) {
  return getOwnedDraft({ table: 'cv_drafts', userId, draftId });
}

export async function updateDraftForUser(userId, draftId, patch) {
  return updateOwnedDraft({
    table: 'cv_drafts',
    userId,
    draftId,
    patch,
    titleFallback: 'Untitled CV',
    nestedKeys: [
      'basics',
      'extras',
      'sectionVisibility',
      'typography',
      'formatting',
      'templateTheme',
      'richText',
    ],
    loadDraft: getDraftForUser,
  });
}

export async function deleteDraftForUser(userId, draftId) {
  return softDeleteOwnedDraft({ table: 'cv_drafts', userId, draftId });
}

export async function createExportRecord({ draftId, userId, fileKey, publicUrl, mimeType, bytes }) {
  const { rows } = await pool.query(
    `INSERT INTO document_exports (document_kind, draft_id, user_id, file_key, public_url, mime_type, bytes)
     VALUES ('cv',$1,$2,$3,$4,$5,$6)
     RETURNING id, document_kind, draft_id, user_id, file_key, public_url, mime_type, bytes, created_at`,
    [draftId || null, Number(userId), fileKey, publicUrl || null, mimeType, bytes],
  );
  return rows[0];
}

export async function createCoverLetterExportRecord({
  userId,
  fileKey,
  publicUrl,
  mimeType,
  bytes,
  sourceDraftId = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO document_exports (document_kind, draft_id, user_id, file_key, public_url, mime_type, bytes)
     VALUES ('cover_letter',$1,$2,$3,$4,$5,$6)
     RETURNING id, document_kind, draft_id, user_id, file_key, public_url, mime_type, bytes, created_at`,
    [sourceDraftId, Number(userId), fileKey, publicUrl || null, mimeType, bytes],
  );
  return rows[0];
}

export async function userCanAccessFileKey(userId, fileKey) {
  const { rows } = await pool.query(
    `SELECT id FROM document_exports WHERE user_id = $1 AND file_key = $2 LIMIT 1`,
    [Number(userId), fileKey],
  );
  return rows.length > 0;
}

export async function getCoverLetterEntitlement(userId) {
  const { rows } = await pool.query(
    `SELECT p.id
     FROM payments p
     LEFT JOIN packages pkg ON pkg.id = p.package_id
     WHERE p.user_id = $1
       AND lower(coalesce(p.status, '')) IN ('success', 'completed')
       AND p.amount >= 1
       AND (
         lower(coalesce(pkg.offer, '')) LIKE '%resume%'
         OR lower(coalesce(pkg.offer, '')) LIKE '%cv%'
       )
     ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST
     LIMIT 1`,
    [Number(userId)],
  );

  return {
    eligible: rows.length > 0,
    reason: rows.length > 0 ? 'qualifying_paid_resume_purchase' : 'requires_paid_resume_purchase',
  };
}

export async function upsertTemplate({ key, name, description, previewUrl }) {
  const { rows } = await pool.query(
    `INSERT INTO cv_templates (key, name, description, preview_url, is_active)
     VALUES ($1,$2,$3,$4,TRUE)
     ON CONFLICT (key) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          preview_url = EXCLUDED.preview_url,
          is_active = TRUE,
          updated_at = NOW()
     RETURNING key AS id, name, description, preview_url AS "previewImage"`,
    [key, name, description || null, previewUrl || null],
  );
  return rows[0];
}

export async function getUserRole(userId) {
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [Number(userId)]);
  return rows[0]?.role || null;
}

export async function ensureTemplatesSeeded(templates = []) {
  for (const t of templates) {
    await upsertTemplate({
      key: t.id,
      name: t.name,
      description: t.description || '',
      previewUrl: t.previewImage || null,
    });
  }
}
