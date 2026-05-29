import type { GuestCvPendingAction } from './guestDraftStorage';

const PENDING_CV_ACTION_KEY = 'cvpro:pending-cv-action:v1';

const isAction = (value: string | null): value is GuestCvPendingAction =>
  value === 'save' || value === 'export' || value === 'download' || value === 'checkout';

export function setPendingCvAction(action: GuestCvPendingAction): void {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(PENDING_CV_ACTION_KEY, action);
  } catch {}
}

export function peekPendingCvAction(): GuestCvPendingAction | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(PENDING_CV_ACTION_KEY);
    return isAction(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function consumePendingCvAction(): GuestCvPendingAction | null {
  const action = peekPendingCvAction();
  try {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(PENDING_CV_ACTION_KEY);
  } catch {}
  return action;
}
