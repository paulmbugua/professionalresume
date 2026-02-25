import {
  listTemplatesFromDb,
  templateExists,
  createDraftForUser,
  listDraftsForUser,
  getDraftForUser,
  updateDraftForUser,
  deleteDraftForUser,
  createExportRecord,
  userCanAccessFileKey,
  upsertTemplate,
  getUserRole,
  ensureTemplatesSeeded,
} from '../services/cvService.js';
import { cvTemplates as localTemplates } from '../services/cvTemplates.js';
import { buildCvHtml, htmlToPdfBuffer } from '../services/cvRenderService.js';
import { putDocObject, signDocGetUrl, getPublicR2Url } from '../services/r2.js';
import {
  createDraftSchema,
  draftPatchSchema,
  cvExportSchema,
  templateUploadSchema,
} from '../validators/cvValidators.js';

function sanitizeObjectKey(input = '') {
  return input
    .replace(/\.\./g, '')
    .replace(/^\/+/, '')
    .replace(/[^\w./-]/g, '_');
}

export async function listTemplates(_req, res) {
  try {
    await ensureTemplatesSeeded(localTemplates);
    const templates = await listTemplatesFromDb();
    return res.json({ templates, source: 'db', fallback: false });
  } catch (err) {
    console.warn('listTemplates fallback to local templates:', err.message);
    return res.json({
      templates: localTemplates,
      source: 'local',
      fallback: true,
    });
  }
}

export async function listDrafts(req, res) {
  try {
    const drafts = await listDraftsForUser(req.user.id);
    return res.json(drafts);
  } catch (err) {
    console.error('listDrafts error', err);
    return res.status(500).json({ error: 'Failed to fetch drafts' });
  }
}

export async function getDraft(req, res) {
  try {
    const draft = await getDraftForUser(req.user.id, req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    return res.json(draft);
  } catch (err) {
    console.error('getDraft error', err);
    return res.status(500).json({ error: 'Failed to fetch draft' });
  }
}

export async function createDraftHandler(req, res) {
  try {
    const { error, value } = createDraftSchema.validate(req.body || {});
    if (error)
      return res
        .status(400)
        .json({ error: error.details?.[0]?.message || error.message });

    const exists = await templateExists(value.templateId);
    if (!exists) return res.status(400).json({ error: 'Invalid templateId' });

    const created = await createDraftForUser(req.user.id, value);
    return res.status(201).json(created);
  } catch (err) {
    console.error('createDraft error', err);
    return res.status(500).json({ error: 'Failed to create draft' });
  }
}

export async function updateDraft(req, res) {
  try {
    const { error, value } = draftPatchSchema.validate(req.body || {});
    if (error)
      return res
        .status(400)
        .json({ error: error.details?.[0]?.message || error.message });

    const updated = await updateDraftForUser(req.user.id, req.params.id, value);
    if (!updated) return res.status(404).json({ error: 'Draft not found' });
    return res.json(updated);
  } catch (err) {
    console.error('updateDraft error', err);
    return res.status(500).json({ error: 'Failed to update draft' });
  }
}

export async function deleteDraft(req, res) {
  try {
    const ok = await deleteDraftForUser(req.user.id, req.params.id);
    if (!ok) return res.status(404).json({ error: 'Draft not found' });
    return res.status(204).send();
  } catch (err) {
    console.error('deleteDraft error', err);
    return res.status(500).json({ error: 'Failed to delete draft' });
  }
}

export async function exportCv(req, res) {
  try {
    const { error, value } = cvExportSchema.validate(req.body || {});
    if (error)
      return res
        .status(400)
        .json({ error: error.details?.[0]?.message || error.message });

    let draft = value.cvJson || null;
    if (value.draftId) {
      draft = await getDraftForUser(req.user.id, value.draftId);
      if (!draft) return res.status(404).json({ error: 'Draft not found' });
    }

    let mimeType = 'application/pdf';
    let buffer;
    const upload = req.file;

    if (upload?.buffer) {
      mimeType = upload.mimetype || 'application/pdf';
      buffer = upload.buffer;
    } else {
      const formattedHtml = buildCvHtml({
        draft: draft || {},
        templateKey: draft?.templateId,
      });
      console.info('exportCv htmlHead=', formattedHtml.slice(0, 200));
      if (
        !formattedHtml.includes('<style') ||
        !formattedHtml.includes('--primary')
      ) {
        throw new Error(
          'Generated export HTML is missing style/theme variables',
        );
      }
      buffer = await htmlToPdfBuffer(formattedHtml);
      mimeType = 'application/pdf';
    }

    const draftSegment = value.draftId || draft?.id || 'adhoc';
    const objectKey = sanitizeObjectKey(
      `cvpro/${req.user.id}/drafts/${draftSegment}/export-${Date.now()}.pdf`,
    );

    const uploaded = await putDocObject({
      key: objectKey,
      body: buffer,
      contentType: mimeType,
    });
    await createExportRecord({
      draftId: value.draftId || draft?.id || null,
      userId: req.user.id,
      fileKey: uploaded.key,
      publicUrl: uploaded.url,
      mimeType: uploaded.contentType,
      bytes: uploaded.bytes,
    });

    return res.status(201).json({
      url: uploaded.url,
      fileKey: uploaded.key,
      signedUrl: await signDocGetUrl(uploaded.key),
      bytes: uploaded.bytes,
      mimeType: uploaded.contentType,
    });
  } catch (err) {
    console.error('exportCv error', err);
    return res
      .status(500)
      .json({ error: err.message || 'Failed to export CV' });
  }
}

export async function getPrintHtml(req, res) {
  try {
    const draft = await getDraftForUser(req.user.id, req.params.id);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });
    const html = buildCvHtml({ draft, templateKey: draft.templateId });
    console.info('getPrintHtml htmlHead=', html.slice(0, 200));
    return res.json({ html });
  } catch (err) {
    console.error('getPrintHtml error', err);
    return res.status(500).json({ error: 'Failed to build printable CV' });
  }
}

export async function signFileDownload(req, res) {
  try {
    const raw = req.params.key || req.query.key;
    if (!raw) return res.status(400).json({ error: 'Missing key' });
    const key = sanitizeObjectKey(decodeURIComponent(String(raw)));

    const allowed = await userCanAccessFileKey(req.user.id, key);
    if (!allowed) return res.status(404).json({ error: 'File not found' });

    const signedUrl = await signDocGetUrl(key);
    return res.json({ key, url: getPublicR2Url(key), signedUrl });
  } catch (err) {
    console.error('signFileDownload error', err);
    return res.status(500).json({ error: 'Failed to sign URL' });
  }
}

export async function uploadTemplate(req, res) {
  try {
    const role = await getUserRole(req.user.id);
    if (!['admin', 'superadmin'].includes(String(role || '').toLowerCase())) {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { error, value } = templateUploadSchema.validate(req.body || {});
    if (error)
      return res
        .status(400)
        .json({ error: error.details?.[0]?.message || error.message });

    let manifestUrl = null;
    if (req.file?.buffer) {
      const key = sanitizeObjectKey(
        `cvpro/templates/${value.key}/manifest-${Date.now()}.json`,
      );
      const uploaded = await putDocObject({
        key,
        body: req.file.buffer,
        contentType: req.file.mimetype || 'application/json',
      });
      manifestUrl = uploaded.url;
    }

    const template = await upsertTemplate({
      key: value.key,
      name: value.name,
      description: value.description,
      previewUrl: value.previewUrl || manifestUrl,
    });

    return res.status(201).json(template);
  } catch (err) {
    console.error('uploadTemplate error', err);
    return res
      .status(500)
      .json({ error: err.message || 'Failed to upload template' });
  }
}
