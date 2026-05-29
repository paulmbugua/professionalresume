import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { CvDraft } from '@cvpro/shared/types';
import { saveGuestCvDraft, type GuestCvBuilderTab, type GuestCvPendingAction } from './guestDraftStorage';
import { setPendingCvAction } from './guestDraftSession';

export function redirectToAuthWithCvReturn({
  action,
  draft,
  activeTab,
  activeSection,
  router,
}: {
  action: GuestCvPendingAction;
  draft: CvDraft;
  activeTab?: GuestCvBuilderTab;
  activeSection?: string;
  router: AppRouterInstance;
}): void {
  const returnTo = '/builder/guest?resumeDraft=guest';
  saveGuestCvDraft({
    draft,
    selectedTemplateId: draft.templateId,
    activeTab,
    activeSection,
    scrollY: typeof window !== 'undefined' ? window.scrollY : undefined,
    pendingAction: action,
    returnTo,
  });
  setPendingCvAction(action);
  router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}&resumeDraft=guest`);
}
