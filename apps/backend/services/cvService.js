import crypto from 'crypto';
import pool from '../config/db.js';

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
    id: crypto.randomUUID(),
    userId: String(userId),
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
    typography: { baseFontSize: 12, h1Size: 28, h2Size: 13, h3Size: 11, bodySize: 12, lineHeight: 1.48, fontFamily: 'Inter, system-ui, Arial' },
    formatting: { textColor: '#0f172a', mutedTextColor: '#475569', linkColor: '#0f766e' },
    templateTheme: { primary: '#0f172a', accent: '#0f766e' },
    richText: {},
    sectionOrder: defaultSectionOrder,
    sectionVisibility: defaultSectionVisibility,
  };
}

function mapDraft(row) {
  const data = row.data_json || {};
  return {
    id: row.id,
    userId: String(row.user_id),
    title: row.title,
    templateId: row.template_key,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    version: row.version,
    ...data,
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
  const id = crypto.randomUUID();
  const normalized = payload.data || buildDefaultDraft({ userId, templateId: payload.templateId, title: payload.title });
  const dataJson = { ...normalized, id, userId: String(userId), templateId: payload.templateId };

  const { rows } = await pool.query(
    `INSERT INTO cv_drafts (id, user_id, title, template_key, data_json)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     RETURNING *`,
    [id, Number(userId), payload.title?.trim() || 'Untitled CV', payload.templateId, JSON.stringify(dataJson)],
  );
  return mapDraft(rows[0]);
}

export async function listDraftsForUser(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM cv_drafts
     WHERE user_id = $1 AND is_deleted = FALSE
     ORDER BY updated_at DESC`,
    [Number(userId)],
  );
  return rows.map(mapDraft);
}

export async function getDraftForUser(userId, draftId) {
  const { rows } = await pool.query(
    `SELECT * FROM cv_drafts
     WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`,
    [draftId, Number(userId)],
  );
  return rows[0] ? mapDraft(rows[0]) : null;
}

export async function updateDraftForUser(userId, draftId, patch) {
  const current = await getDraftForUser(userId, draftId);
  if (!current) return null;

  const merged = {
    ...current,
    ...patch,
    basics: { ...current.basics, ...(patch.basics || {}) },
    extras: { ...current.extras, ...(patch.extras || {}) },
    sectionVisibility: { ...current.sectionVisibility, ...(patch.sectionVisibility || {}) },
    typography: { ...(current.typography || {}), ...(patch.typography || {}) },
    formatting: { ...(current.formatting || {}), ...(patch.formatting || {}) },
    templateTheme: { ...(current.templateTheme || {}), ...(patch.templateTheme || {}) },
    richText: { ...(current.richText || {}), ...(patch.richText || {}) },
    id: draftId,
    userId: String(userId),
    templateId: patch.templateId || current.templateId,
  };

  const { rows } = await pool.query(
    `UPDATE cv_drafts
        SET title = $1,
            template_key = $2,
            data_json = $3::jsonb,
            version = version + 1,
            updated_at = NOW()
      WHERE id = $4 AND user_id = $5 AND is_deleted = FALSE
      RETURNING *`,
    [merged.title || current.title || 'Untitled CV', merged.templateId, JSON.stringify(merged), draftId, Number(userId)],
  );

  return rows[0] ? mapDraft(rows[0]) : null;
}

export async function deleteDraftForUser(userId, draftId) {
  const { rows } = await pool.query(
    `UPDATE cv_drafts
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
      RETURNING id`,
    [draftId, Number(userId)],
  );
  return rows.length > 0;
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
