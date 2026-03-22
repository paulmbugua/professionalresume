import {
  createCoverLetterForUser,
  deleteCoverLetterForUser,
  getCoverLetterForUser,
  listCoverLettersForUser,
  updateCoverLetterForUser,
} from '../services/coverLetterService.js';
import {
  createCoverLetterSchema,
  patchCoverLetterSchema,
} from '../validators/coverLetterValidators.js';

function validationErrorResponse(res, error) {
  return res
    .status(400)
    .json({ error: error.details?.[0]?.message || error.message });
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
