import type { CvDraft } from '@cvpro/shared/types';

export type GuestCvPendingAction = 'save' | 'export' | 'download' | 'checkout';
export type GuestCvBuilderTab = 'edit' | 'preview';

export type GuestCvDraftPayload = {
  version: 1;
  clientDraftId: string;
  draft: CvDraft;
  selectedTemplateId: string;
  activeTab: GuestCvBuilderTab;
  activeSection?: string;
  scrollY?: number;
  scrollPosition?: { windowY?: number; builderPanelY?: number; previewY?: number };
  editorState?: Record<string, unknown>;
  previewState?: Record<string, unknown>;
  sessionHash?: string;
  lastEditedAt: string;
  pendingAction?: GuestCvPendingAction | null;
  returnTo: string;
  synced?: boolean;
  syncedDraftId?: string;
  pendingActionConsumedAt?: string;
};

export type SaveGuestCvDraftInput = {
  draft: CvDraft;
  selectedTemplateId?: string;
  activeTab?: GuestCvBuilderTab;
  activeSection?: string;
  scrollY?: number;
  scrollPosition?: { windowY?: number; builderPanelY?: number; previewY?: number };
  editorState?: Record<string, unknown>;
  previewState?: Record<string, unknown>;
  sessionHash?: string;
  pendingAction?: GuestCvPendingAction | null;
  returnTo?: string;
  clientDraftId?: string;
  synced?: boolean;
  syncedDraftId?: string;
  pendingActionConsumedAt?: string;
};

export const GUEST_CV_DRAFT_STORAGE_KEY = 'cvpro:builder-session:v1';
export const BUILDER_CONTINUATION_FLAG_KEY = 'cvpro:pending-builder-continuation';
const LEGACY_GUEST_CV_DRAFT_STORAGE_KEY = 'cvpro:guest-cv-draft:v1';

const isBrowser = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const createClientDraftId = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {}
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const safeReturnTo = (returnTo?: string) => {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) return '/builder/guest';
  return returnTo;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const hasDraftContent = (draft?: Partial<CvDraft>) => {
  if (!draft) return false;
  const basics = (draft.basics || {}) as Partial<NonNullable<CvDraft['basics']>>;
  const textFields = [
    draft.title,
    draft.summary,
    basics.name,
    basics.headline,
    basics.email,
    basics.phone,
    basics.location,
  ];
  if (textFields.some((value) => typeof value === 'string' && value.trim())) return true;
  if (
    Array.isArray(basics.links) &&
    basics.links.some((link) => link?.label?.trim() || link?.url?.trim())
  )
    return true;
  if (Array.isArray(draft.skills) && draft.skills.some((skill) => skill?.trim())) return true;
  if (Array.isArray(draft.experience) && draft.experience.length > 0) return true;
  if (Array.isArray(draft.education) && draft.education.length > 0) return true;
  if (Array.isArray(draft.projects) && draft.projects.length > 0) return true;
  if (Array.isArray(draft.certifications) && draft.certifications.length > 0) return true;
  if (draft.extras?.languages?.some((item) => item?.trim())) return true;
  if (draft.extras?.interests?.some((item) => item?.trim())) return true;
  return Boolean(draft.templateId);
};

export function loadGuestCvDraft(): GuestCvDraftPayload | null {
  if (!isBrowser()) return null;
  const raw =
    window.localStorage.getItem(GUEST_CV_DRAFT_STORAGE_KEY) ||
    window.localStorage.getItem(LEGACY_GUEST_CV_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed) || parsed.version !== 1 || !isObject(parsed.draft)) return null;
    const payload = parsed as GuestCvDraftPayload;
    if (!hasDraftContent(payload.draft)) return null;
    return payload;
  } catch {
    window.localStorage.removeItem(GUEST_CV_DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_GUEST_CV_DRAFT_STORAGE_KEY);
    window.localStorage.removeItem(BUILDER_CONTINUATION_FLAG_KEY);
    return null;
  }
}

export function saveGuestCvDraft(input: SaveGuestCvDraftInput): GuestCvDraftPayload | null {
  if (!isBrowser()) return null;

  const existing = loadGuestCvDraft();
  const payload: GuestCvDraftPayload = {
    version: 1,
    clientDraftId: input.clientDraftId || existing?.clientDraftId || createClientDraftId(),
    draft: input.draft,
    selectedTemplateId:
      input.selectedTemplateId ||
      input.draft.templateId ||
      existing?.selectedTemplateId ||
      'ats-minimal',
    activeTab: input.activeTab || existing?.activeTab || 'edit',
    activeSection: input.activeSection ?? existing?.activeSection,
    scrollY: typeof input.scrollY === 'number' ? input.scrollY : existing?.scrollY,
    scrollPosition: input.scrollPosition || existing?.scrollPosition,
    editorState: input.editorState || existing?.editorState,
    previewState: input.previewState || existing?.previewState,
    sessionHash: input.sessionHash || existing?.sessionHash,
    lastEditedAt: new Date().toISOString(),
    pendingAction:
      input.pendingAction === null ? undefined : (input.pendingAction ?? existing?.pendingAction),
    returnTo: safeReturnTo(input.returnTo || existing?.returnTo),
    synced: input.synced ?? existing?.synced,
    syncedDraftId: input.syncedDraftId ?? existing?.syncedDraftId,
    pendingActionConsumedAt: input.pendingActionConsumedAt ?? existing?.pendingActionConsumedAt,
  };

  try {
    window.localStorage.setItem(GUEST_CV_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function clearGuestCvDraft(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(GUEST_CV_DRAFT_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_GUEST_CV_DRAFT_STORAGE_KEY);
  window.localStorage.removeItem(BUILDER_CONTINUATION_FLAG_KEY);
}

export function markGuestDraftSynced(syncedDraftId: string): void {
  const existing = loadGuestCvDraft();
  if (!existing) return;
  saveGuestCvDraft({
    ...existing,
    draft: existing.draft,
    synced: true,
    syncedDraftId,
    pendingAction: existing.pendingAction,
  });
}

export function markGuestDraftPendingActionConsumed(): void {
  const existing = loadGuestCvDraft();
  if (!existing) return;
  saveGuestCvDraft({
    ...existing,
    draft: existing.draft,
    pendingAction: null,
    pendingActionConsumedAt: new Date().toISOString(),
  });
}

export function hasRecoverableGuestDraft(): boolean {
  const payload = loadGuestCvDraft();
  return Boolean(payload && !payload.synced);
}

export function setPendingBuilderContinuation(sessionHash?: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      BUILDER_CONTINUATION_FLAG_KEY,
      JSON.stringify({ version: 1, sessionHash, createdAt: new Date().toISOString() })
    );
  } catch {}
}

export function hasPendingBuilderContinuation(): boolean {
  if (!isBrowser()) return false;
  return Boolean(window.localStorage.getItem(BUILDER_CONTINUATION_FLAG_KEY));
}

export function consumePendingBuilderContinuation(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(BUILDER_CONTINUATION_FLAG_KEY);
}

export function createBuilderSessionHash(draft: CvDraft, meta?: Record<string, unknown>): string {
  const source = JSON.stringify({ draft, meta });
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return `session-${Math.abs(hash).toString(36)}-${source.length.toString(36)}`;
}
