import type { CvDraft } from '@cvpro/shared/types';
import { renderAtsMinimalHtml } from './AtsMinimal';
import { renderModernTealHtml } from './ModernTeal';
import { renderModernSidebarBlueHtml } from './ModernSidebarBlue';
import { renderAtsCompactHtml } from './AtsCompact';

export const renderTemplateThumbnailHtml = (
  templateId: string,
  draft: CvDraft
): string | undefined => {
  if (templateId === 'ats-minimal') return renderAtsMinimalHtml(draft);
  if (templateId === 'modern-teal') return renderModernTealHtml(draft);
  if (templateId === 'modern-sidebar-blue') return renderModernSidebarBlueHtml(draft);
  if (templateId === 'ats-compact') return renderAtsCompactHtml(draft);
  return undefined;
};
