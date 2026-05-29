import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { CvDraft } from '@cvpro/shared/types';
import {
  createBuilderSessionHash,
  saveGuestCvDraft,
  setPendingBuilderContinuation,
  type GuestCvBuilderTab,
  type GuestCvPendingAction,
} from './guestDraftStorage';
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
  const returnTo = '/builder/guest';
  const scrollPosition = {
    windowY: typeof window !== 'undefined' ? window.scrollY : undefined,
    builderPanelY:
      typeof document !== 'undefined'
        ? document.querySelector<HTMLElement>('[data-cv-builder-panel]')?.scrollTop
        : undefined,
    previewY:
      typeof document !== 'undefined'
        ? document.querySelector<HTMLElement>('[data-cv-preview-scroll]')?.scrollTop
        : undefined,
  };
  const sessionHash = createBuilderSessionHash(draft, {
    selectedTemplateId: draft.templateId,
    activeTab,
    activeSection,
    pendingAction: action,
    scrollPosition,
  });
  saveGuestCvDraft({
    draft,
    selectedTemplateId: draft.templateId,
    activeTab,
    activeSection,
    scrollY: scrollPosition.windowY,
    scrollPosition,
    editorState: { activeSection },
    previewState: { selectedTemplateId: draft.templateId },
    sessionHash,
    pendingAction: action,
    returnTo,
  });
  setPendingBuilderContinuation(sessionHash);
  setPendingCvAction(action);
  router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
}
