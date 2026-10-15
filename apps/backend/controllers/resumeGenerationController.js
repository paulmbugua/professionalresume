import crypto from 'node:crypto';
import Joi from 'joi';
import pool from '../config/db.js';
import {
  ingestResume,
  resumeError,
} from '../services/resumeIngestionService.js';
import { generateResume } from '../services/resumeGenerationService.js';
import {
  resumeDataSchema,
  validateSchema,
} from '../services/resumeGenerationSchema.js';
import { buildDefaultDraft } from '../services/cvService.js';
import { renderersById } from '../../../packages/shared/cv/renderers/index.js';

const requestSchema = Joi.object({
  originalDocumentId: Joi.string().guid().required(),
  targetJobDescription: Joi.string().trim().min(40).max(60000).required(),
  selectedTemplate: Joi.string()
    .valid(...Object.keys(renderersById))
    .required(),
  draftId: Joi.string().guid().optional(),
  generationPreferences: Joi.object({
    tone: Joi.string()
      .valid('professional', 'concise', 'confident')
      .default('professional'),
  }).default({ tone: 'professional' }),
  section: Joi.string()
    .valid(
      'summary',
      'skills',
      'experience',
      'projects',
      'education',
      'certifications',
      'extras',
      'additionalSections',
      'targetTitle',
    )
    .optional(),
  instruction: Joi.string().trim().max(2000).optional(),
  currentResume: Joi.object().optional(),
});

function sendError(res, error) {
  console.error('[resume-ai]', {
    code: error.code || error.name,
    status: error.status || 500,
    ...(error.providerRequestId
      ? { providerRequestId: error.providerRequestId }
      : {}),
  });
  const status =
    error.status && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
  if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
  return res.status(status).json({
    error:
      status === 500
        ? 'Could not build the resume. Please try again.'
        : error.message,
    code: error.code || 'RESUME_BUILD_ERROR',
    ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}),
    ...(error.claims ? { claims: error.claims } : {}),
  });
}

async function loadOriginal(userId, documentId) {
  const { rows } = await pool.query(
    `SELECT d.id, d.document_json, f.id AS file_id, f.filename, f.mime_type, f.bytes
    FROM original_resume_documents d JOIN original_resume_files f ON f.id=d.file_id
    WHERE d.id=$1 AND d.user_id=$2 AND f.user_id=$2`,
    [documentId, userId],
  );
  if (!rows[0])
    throw resumeError('Original resume not found in your account.', 404);
  const row = rows[0];
  return {
    id: row.id,
    fileId: row.file_id,
    filename: row.filename,
    mimetype: row.mime_type,
    buffer: row.bytes,
    document: row.document_json,
  };
}

export async function ingestOriginalResume(req, res) {
  let db;
  try {
    const source = await ingestResume({
      buffer: req.file?.buffer,
      filename: req.file?.originalname,
      mimetype: req.file?.mimetype,
    });
    db = await pool.connect();
    await db.query('BEGIN');
    const fileId = crypto.randomUUID();
    const documentId = crypto.randomUUID();
    await db.query(
      'INSERT INTO original_resume_files(id,user_id,filename,mime_type,sha256,bytes) VALUES($1,$2,$3,$4,$5,$6)',
      [
        fileId,
        req.user.id,
        source.filename,
        source.mimetype,
        source.sha256,
        source.buffer,
      ],
    );
    await db.query(
      'INSERT INTO original_resume_documents(id,file_id,user_id,document_json) VALUES($1,$2,$3,$4)',
      [documentId, fileId, req.user.id, JSON.stringify(source.document)],
    );
    await db.query('COMMIT');
    return res.status(201).json({
      originalDocumentId: documentId,
      originalFileId: fileId,
      filename: source.filename,
      kind: source.document.kind,
      warnings: source.document.warnings,
    });
  } catch (error) {
    if (db) await db.query('ROLLBACK');
    return sendError(res, error);
  } finally {
    db?.release();
  }
}

export async function buildAiResume(req, res) {
  let db;
  try {
    const { error, value } = requestSchema.validate(req.body);
    if (error) throw resumeError(error.details[0].message);
    const userId = Number(req.user.id);
    let current;
    if (value.draftId) {
      const { rows } = await pool.query(
        'SELECT * FROM cv_drafts WHERE id=$1 AND user_id=$2 AND is_deleted=FALSE',
        [value.draftId, userId],
      );
      current = rows[0];
      if (!current) throw resumeError('Resume not found in your account.', 404);
    }
    if (value.section) {
      if (!current || !value.currentResume || !value.instruction)
        throw resumeError(
          'Choose a generated resume, section and improvement request.',
        );
      if (
        current.data_json?.generationMeta?.originalDocumentId !==
        value.originalDocumentId
      )
        throw resumeError(
          "Regenerate using this resume's original source document.",
        );
      validateSchema(value.currentResume, resumeDataSchema);
    }
    const originalResumeDocument = await loadOriginal(
      userId,
      value.originalDocumentId,
    );
    const generated = await generateResume({
      ...value,
      originalResumeDocument,
    });
    const versionId = crypto.randomUUID();
    const draftId = current?.id || crypto.randomUUID();
    const draft = {
      ...buildDefaultDraft({
        userId,
        templateId: value.selectedTemplate,
        title: `${generated.resumeData.basics.name || 'My'} Resume`,
      }),
      ...(current?.data_json || {}),
      ...generated.resumeData,
      id: draftId,
      userId: String(userId),
      templateId: value.selectedTemplate,
      richText: {},
      ...(value.section
        ? {}
        : {
            templateTheme: {},
            sectionVisibility: {},
            sectionOrder: undefined,
          }),
      generationMeta: {
        originalDocumentId: originalResumeDocument.id,
        originalFileId: originalResumeDocument.fileId,
        filename: originalResumeDocument.filename,
        generatedResumeVersionId: versionId,
        targetJobDescription: value.targetJobDescription,
        model: generated.model,
        verifiedAt: new Date().toISOString(),
        warningCount: generated.factReview.warnings.length,
      },
      meta: {
        isDemoSeeded: false,
        hasImportedCv: true,
        importedAt: new Date().toISOString(),
        importMode: 'replace',
      },
    };
    db = await pool.connect();
    await db.query('BEGIN');
    if (current) {
      const updated = await db.query(
        `UPDATE cv_drafts SET data_json=$1,template_key=$2,version=version+1,updated_at=NOW()
        WHERE id=$3 AND user_id=$4 AND version=$5 AND is_deleted=FALSE RETURNING *`,
        [
          JSON.stringify(draft),
          value.selectedTemplate,
          draftId,
          userId,
          current.version,
        ],
      );
      if (!updated.rowCount)
        throw resumeError(
          'Your resume changed while AI was building. Your edits were kept. Please rebuild again.',
          409,
          'RESUME_CHANGED',
        );
      draft.version = updated.rows[0].version;
      draft.updatedAt = updated.rows[0].updated_at;
    } else {
      await db.query(
        'INSERT INTO cv_drafts(id,user_id,title,template_key,data_json) VALUES($1,$2,$3,$4,$5)',
        [
          draftId,
          userId,
          draft.title,
          value.selectedTemplate,
          JSON.stringify(draft),
        ],
      );
    }
    await db.query(
      `INSERT INTO generated_resume_versions(id,user_id,draft_id,original_document_id,resume_data,fact_review,job_description,template_metadata,model,action)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        versionId,
        userId,
        draftId,
        originalResumeDocument.id,
        JSON.stringify(generated.resumeData),
        JSON.stringify(generated.factReview),
        value.targetJobDescription,
        JSON.stringify(generated.templateMetadata),
        generated.model,
        value.section ? `regenerate:${value.section}` : 'build',
      ],
    );
    await db.query('COMMIT');
    return res.json({
      draft,
      factReview: generated.factReview,
      generatedResumeVersionId: versionId,
    });
  } catch (error) {
    if (db) await db.query('ROLLBACK');
    return sendError(res, error);
  } finally {
    db?.release();
  }
}

export async function getResumeVersions(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT v.id, v.resume_data AS "resumeData", v.fact_review AS "factReview", v.original_document_id AS "originalDocumentId", v.job_description AS "targetJobDescription", f.filename, v.model, v.action, v.created_at AS "createdAt"
      FROM generated_resume_versions v JOIN original_resume_documents d ON d.id=v.original_document_id JOIN original_resume_files f ON f.id=d.file_id
      WHERE v.user_id=$1 AND d.user_id=$1 AND f.user_id=$1 AND v.draft_id=$2 ORDER BY v.created_at DESC LIMIT 20`,
      [req.user.id, req.params.id],
    );
    res.json({ versions: rows });
  } catch (error) {
    sendError(res, error);
  }
}

export async function downloadOriginalResume(req, res) {
  try {
    const source = await loadOriginal(req.user.id, req.params.id);
    res.setHeader('Content-Type', source.mimetype);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(source.filename)}`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(source.buffer);
  } catch (error) {
    sendError(res, error);
  }
}
