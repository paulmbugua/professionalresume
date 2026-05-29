import type { CvDraft } from '@cvpro/shared/types';
import { clearGuestCvDraft, loadGuestCvDraft, saveGuestCvDraft } from './cv/guestDraftStorage';

export type PendingCvAction = 'save' | 'export' | 'print';
export type PendingPaymentResumeAction = 'resume_export' | 'resume_print';

const GUEST_DRAFT_KEY = 'cv:guestDraft';
const PENDING_ACTION_KEY = 'cv:pendingAction';
const AUTH_REASON_KEY = 'auth:cvReason';
const PENDING_PAYMENT_RETURN_KEY = 'cv:pendingPaymentReturn';
const PENDING_PAYMENT_BUILDER_STATE_KEY = 'cv:pendingBuilderState';
const PENDING_PAYMENT_ACTION_KEY = 'cv:pendingExportIntent';

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
  saveGuestCvDraft({
    draft,
    selectedTemplateId: draft.templateId,
    returnTo: '/builder/guest',
  });
}

export function restoreGuestCvState(): CvDraft | null {
  const localDraft = loadGuestCvDraft();
  if (localDraft?.draft) return localDraft.draft;

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
  clearGuestCvDraft();
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

export type PendingPaymentReturn = {
  returnTo: string;
  source: 'cv_builder';
  createdAt: string;
};

export type PendingCvBuilderState = {
  draftId: string;
  templateId: string;
  pendingAction: PendingPaymentResumeAction;
  snapshot: CvDraft;
  source: 'cv_builder';
  createdAt: string;
};

export function persistPendingPaymentReturn(payload: PendingPaymentReturn): void {
  console.info('[cv-payment-return] persist return target', payload);
  writeSession(PENDING_PAYMENT_RETURN_KEY, JSON.stringify(payload));
}

export function restorePendingPaymentReturn(): PendingPaymentReturn | null {
  const raw = readSession(PENDING_PAYMENT_RETURN_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingPaymentReturn;
    if (!parsed?.returnTo?.startsWith('/')) return null;
    return parsed;
  } catch {
    removeSession(PENDING_PAYMENT_RETURN_KEY);
    return null;
  }
}

export function persistPendingCvBuilderState(payload: PendingCvBuilderState): void {
  console.info('[cv-payment-return] persist builder snapshot', {
    draftId: payload.draftId,
    templateId: payload.templateId,
    pendingAction: payload.pendingAction,
  });
  writeSession(PENDING_PAYMENT_BUILDER_STATE_KEY, JSON.stringify(payload));
  writeSession(PENDING_PAYMENT_ACTION_KEY, payload.pendingAction);
}

export function restorePendingCvBuilderState(): PendingCvBuilderState | null {
  const raw = readSession(PENDING_PAYMENT_BUILDER_STATE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingCvBuilderState;
    if (!parsed?.draftId || !parsed?.snapshot) return null;
    return parsed;
  } catch {
    removeSession(PENDING_PAYMENT_BUILDER_STATE_KEY);
    return null;
  }
}

export function peekPendingPaymentAction(): PendingPaymentResumeAction | null {
  const raw = readSession(PENDING_PAYMENT_ACTION_KEY);
  if (raw === 'resume_export' || raw === 'resume_print') return raw;
  return null;
}

export function clearPendingPaymentReturnState(): void {
  removeSession(PENDING_PAYMENT_RETURN_KEY);
  removeSession(PENDING_PAYMENT_BUILDER_STATE_KEY);
  removeSession(PENDING_PAYMENT_ACTION_KEY);
}
