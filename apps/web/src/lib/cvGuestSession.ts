import type { CvDraft } from '@cvpro/shared/types';

export type PendingCvAction = 'save' | 'export' | 'print';

const GUEST_DRAFT_KEY = 'cv:guestDraft';
const PENDING_ACTION_KEY = 'cv:pendingAction';
const AUTH_REASON_KEY = 'auth:cvReason';

const readSession = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(key);
};

const writeSession = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(key, value);
};

const removeSession = (key: string): void => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(key);
};

export function persistGuestCvState(draft: CvDraft): void {
  writeSession(GUEST_DRAFT_KEY, JSON.stringify(draft));
}

export function restoreGuestCvState(): CvDraft | null {
  const raw = readSession(GUEST_DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CvDraft;
  } catch {
    removeSession(GUEST_DRAFT_KEY);
    return null;
  }
}

export function clearGuestCvState(): void {
  removeSession(GUEST_DRAFT_KEY);
}

export function setPendingBuilderAction(action: PendingCvAction): void {
  writeSession(PENDING_ACTION_KEY, action);
}

export function peekPendingBuilderAction(): PendingCvAction | null {
  const raw = readSession(PENDING_ACTION_KEY);
  if (raw === 'save' || raw === 'export' || raw === 'print') return raw;
  return null;
}

export function consumePendingBuilderAction(): PendingCvAction | null {
  const action = peekPendingBuilderAction();
  removeSession(PENDING_ACTION_KEY);
  return action;
}

export function clearPendingBuilderAction(): void {
  removeSession(PENDING_ACTION_KEY);
}

export function setBuilderAuthReason(reason: string): void {
  writeSession(AUTH_REASON_KEY, reason);
}

export function consumeBuilderAuthReason(): string {
  const reason = readSession(AUTH_REASON_KEY) || '';
  removeSession(AUTH_REASON_KEY);
  return reason;
}
