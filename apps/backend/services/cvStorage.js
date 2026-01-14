import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storagePath = path.resolve(__dirname, '..', 'storage', 'cvDrafts.json');

async function ensureStore() {
  const dir = path.dirname(storagePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(storagePath);
  } catch {
    await fs.writeFile(storagePath, JSON.stringify([], null, 2));
  }
}

async function readDrafts() {
  await ensureStore();
  try {
    const raw = await fs.readFile(storagePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[cvStorage] read error', err);
    return [];
  }
}

async function writeDrafts(drafts) {
  await ensureStore();
  await fs.writeFile(storagePath, JSON.stringify(drafts, null, 2));
}

export async function listDraftsForUser(userId) {
  const drafts = await readDrafts();
  return drafts.filter((draft) => String(draft.userId) === String(userId));
}

export async function getDraftById(id) {
  const drafts = await readDrafts();
  return drafts.find((draft) => String(draft.id) === String(id));
}

export async function createDraft(draft) {
  const drafts = await readDrafts();
  drafts.push(draft);
  await writeDrafts(drafts);
  return draft;
}

export async function saveDraft(updatedDraft) {
  const drafts = await readDrafts();
  const idx = drafts.findIndex((draft) => String(draft.id) === String(updatedDraft.id));
  if (idx === -1) {
    drafts.push(updatedDraft);
  } else {
    drafts[idx] = updatedDraft;
  }
  await writeDrafts(drafts);
  return updatedDraft;
}
