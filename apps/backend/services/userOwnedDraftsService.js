import crypto from 'crypto';
import pool from '../config/db.js';

function normalizeUserId(userId) {
  return Number(userId);
}

export function mapOwnedDraftRow(row, { templateColumn = 'template_key' } = {}) {
  const data = row.data_json || {};
  return {
    id: row.id,
    userId: String(row.user_id),
    title: row.title,
    templateId: row[templateColumn],
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    version: row.version,
    ...data,
  };
}

export async function createOwnedDraft({
  table,
  userId,
  title,
  templateId,
  data,
  templateColumn = 'template_key',
}) {
  const id = crypto.randomUUID();
  const dataJson = { ...data, id, userId: String(userId), templateId };

  const { rows } = await pool.query(
    `INSERT INTO ${table} (id, user_id, title, ${templateColumn}, data_json)
     VALUES ($1,$2,$3,$4,$5::jsonb)
     RETURNING *`,
    [id, normalizeUserId(userId), title, templateId, JSON.stringify(dataJson)],
  );

  return mapOwnedDraftRow(rows[0], { templateColumn });
}

export async function listOwnedDrafts({
  table,
  userId,
  mapper = mapOwnedDraftRow,
  templateColumn = 'template_key',
}) {
  const { rows } = await pool.query(
    `SELECT * FROM ${table}
     WHERE user_id = $1 AND is_deleted = FALSE
     ORDER BY updated_at DESC`,
    [normalizeUserId(userId)],
  );

  return rows.map((row) => mapper(row, { templateColumn }));
}

export async function getOwnedDraft({
  table,
  userId,
  draftId,
  mapper = mapOwnedDraftRow,
  templateColumn = 'template_key',
}) {
  const { rows } = await pool.query(
    `SELECT * FROM ${table}
     WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`,
    [draftId, normalizeUserId(userId)],
  );

  return rows[0] ? mapper(rows[0], { templateColumn }) : null;
}

export function mergeOwnedDraft(current, patch, nestedKeys = []) {
  const mergedNested = nestedKeys.reduce((acc, key) => {
    if (current[key] || patch[key]) {
      acc[key] = { ...(current[key] || {}), ...((patch && patch[key]) || {}) };
    }
    return acc;
  }, {});

  return {
    ...current,
    ...patch,
    ...mergedNested,
  };
}

export async function updateOwnedDraft({
  table,
  userId,
  draftId,
  patch,
  nestedKeys = [],
  templateColumn = 'template_key',
  titleFallback = 'Untitled Draft',
  loadDraft,
}) {
  const current = await loadDraft(userId, draftId);
  if (!current) return null;

  const merged = {
    ...mergeOwnedDraft(current, patch, nestedKeys),
    id: draftId,
    userId: String(userId),
    templateId: patch.templateId || current.templateId,
  };

  const { rows } = await pool.query(
    `UPDATE ${table}
      SET title = $1,
          ${templateColumn} = $2,
          data_json = $3::jsonb,
          version = version + 1,
          updated_at = NOW()
      WHERE id = $4 AND user_id = $5 AND is_deleted = FALSE
      RETURNING *`,
    [
      merged.title || current.title || titleFallback,
      merged.templateId,
      JSON.stringify(merged),
      draftId,
      normalizeUserId(userId),
    ],
  );

  return rows[0] ? mapOwnedDraftRow(rows[0], { templateColumn }) : null;
}

export async function softDeleteOwnedDraft({ table, userId, draftId }) {
  const { rows } = await pool.query(
    `UPDATE ${table}
      SET is_deleted = TRUE,
          deleted_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
      RETURNING id`,
    [draftId, normalizeUserId(userId)],
  );

  return rows.length > 0;
}
