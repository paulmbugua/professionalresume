import {
  createCoverLetterForUser,
  deleteCoverLetterForUser,
  getCoverLetterForUser,
  listCoverLettersForUser,
  updateCoverLetterForUser,
} from '../services/coverLetterService.js';
import { buildCvHtml, htmlToPdfBuffer } from '../services/cvRenderService.js';
import { putDocObject, signDocGetUrl } from '../services/r2.js';
import { createCoverLetterExportRecord } from '../services/cvService.js';
import { normalizeCoverLetterRenderModel } from '../../../packages/shared/cover-letter/renderers/renderModel.js';
import {
  createCoverLetterSchema,
  coverLetterExportSchema,
  patchCoverLetterSchema,
} from '../validators/coverLetterValidators.js';

function validationErrorResponse(res, error) {
  return res
    .status(400)
    .json({ error: error.details?.[0]?.message || error.message });
}

function sanitizeObjectKey(input = '') {
  return input
    .replace(/\.\./g, '')
    .replace(/^\/+/, '')
    .replace(/[^\w./-]/g, '_');
}

export async function listCoverLetters(req, res) {
  try {
    const drafts = await listCoverLettersForUser(req.user.id);
    return res.json(drafts);
  } catch (err) {
    console.error('listCoverLetters error', err);
    return res.status(500).json({ error: 'Failed to fetch cover letters' });
  }
}

export async function getCoverLetter(req, res) {
  try {
    const draft = await getCoverLetterForUser(req.user.id, req.params.id);
    if (!draft) return res.status(404).json({ error: 'Cover letter not found' });
    return res.json(draft);
  } catch (err) {
    console.error('getCoverLetter error', err);
    return res.status(500).json({ error: 'Failed to fetch cover letter' });
  }
}

export async function createCoverLetter(req, res) {
  try {
    const { error, value } = createCoverLetterSchema.validate(req.body || {});
    if (error) return validationErrorResponse(res, error);

    const created = await createCoverLetterForUser(req.user.id, value);
    return res.status(201).json(created);
  } catch (err) {
    console.error('createCoverLetter error', err);
    return res.status(500).json({ error: 'Failed to create cover letter' });
  }
}

export async function updateCoverLetter(req, res) {
  try {
    const { error, value } = patchCoverLetterSchema.validate(req.body || {});
    if (error) return validationErrorResponse(res, error);

    const updated = await updateCoverLetterForUser(req.user.id, req.params.id, value);
    if (!updated) return res.status(404).json({ error: 'Cover letter not found' });
    return res.json(updated);
  } catch (err) {
    console.error('updateCoverLetter error', err);
    return res.status(500).json({ error: 'Failed to update cover letter' });
  }
}

export async function deleteCoverLetter(req, res) {
  try {
    const ok = await deleteCoverLetterForUser(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Cover letter not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('deleteCoverLetter error', err);
    return res.status(500).json({ error: 'Failed to delete cover letter' });
  }
}

export async function getCoverLetterPrintHtml(req, res) {
  try {
    const { error, value } = coverLetterExportSchema.validate(req.body || {});
    if (error) return validationErrorResponse(res, error);

    console.info('[coverLetter.printHtml] route-hit', {
      userId: req.user?.id,
      hasDraftId: Boolean(value.draftId),
    });

    let exportDraft = value.coverLetterJson || {};
    if (value.draftId) {
      const draft = await getCoverLetterForUser(req.user.id, value.draftId);
      if (!draft) return res.status(404).json({ error: 'Cover letter draft not found' });
      exportDraft = draft;
    }

    const renderModel = normalizeCoverLetterRenderModel(exportDraft);
    console.info('[coverLetter.printHtml] template', { templateId: renderModel.templateId });
    const html = buildCvHtml({ draft: renderModel });
    return res.json({ html });
  } catch (err) {
    console.error('getCoverLetterPrintHtml error', err);
    return res.status(500).json({ error: 'Failed to build cover letter html' });
  }
}

export async function exportCoverLetter(req, res) {
  try {
    const { error, value } = coverLetterExportSchema.validate(req.body || {});
    if (error) return validationErrorResponse(res, error);

    console.info('[coverLetter.export] route-hit', {
      userId: req.user?.id,
      draftId: value.draftId || null,
      entitlement: req.coverLetterEntitlement || null,
    });

    let sourceDraftId = null;
    let exportDraft = value.coverLetterJson || {};

    if (value.draftId) {
      const draft = await getCoverLetterForUser(req.user.id, value.draftId);
      if (!draft) return res.status(404).json({ error: 'Cover letter draft not found' });
      sourceDraftId = draft.id;
      exportDraft = {
        ...draft,
        ...(value.coverLetterJson || {}),
      };
    }

    const normalizedDraft = normalizeCoverLetterRenderModel(exportDraft);
    console.info('[coverLetter.export] renderer-selection', {
      templateId: normalizedDraft.templateId,
    });
    const html = buildCvHtml({ draft: normalizedDraft });
    const buffer = await htmlToPdfBuffer(html);
    console.info('[coverLetter.export] pdf-generated', { bytes: buffer.length });

    const objectKey = sanitizeObjectKey(
      `cvpro/${req.user.id}/cover-letters/export-${Date.now()}.pdf`,
    );
    const uploaded = await putDocObject({
      key: objectKey,
      body: buffer,
      contentType: 'application/pdf',
    });

    const exportRecord = await createCoverLetterExportRecord({
      userId: req.user.id,
      sourceDraftId,
      fileKey: uploaded.key,
      publicUrl: uploaded.url,
      mimeType: uploaded.contentType,
      bytes: uploaded.bytes,
    });
    console.info('[coverLetter.export] record-created', { exportId: exportRecord?.id || null });

    return res.status(201).json({
      url: uploaded.url,
      fileKey: uploaded.key,
      signedUrl: await signDocGetUrl(uploaded.key),
      bytes: uploaded.bytes,
      mimeType: uploaded.contentType,
    });
  } catch (err) {
    console.error('exportCoverLetter error', err);
    return res.status(500).json({ error: err.message || 'Failed to export cover letter' });
  }
}
