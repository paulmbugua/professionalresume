import React from 'react';
import type { CvDraft } from '@mytutorapp/shared/types';
import AtsMinimal from './templates/AtsMinimal';
import ModernSidebar from './templates/ModernSidebar';
import BoldHeader from './templates/BoldHeader';
import ElegantSerif from './templates/ElegantSerif';
import CreativeTimeline from './templates/CreativeTimeline';
import CompactOnePager from './templates/CompactOnePager';

const templateMap: Record<string, React.FC<{ draft: CvDraft }>> = {
  'ats-minimal': AtsMinimal,
  'modern-sidebar': ModernSidebar,
  'bold-header': BoldHeader,
  'elegant-serif': ElegantSerif,
  'creative-timeline': CreativeTimeline,
  'compact-one-pager': CompactOnePager,
};

type Props = {
  draft: CvDraft;
};

const CvPreview: React.FC<Props> = ({ draft }) => {
  const Template = templateMap[draft.templateId] || AtsMinimal;

  return (
    <div className="cv-preview-wrapper mx-auto w-full max-w-[820px]">
      <div className="cv-page min-h-[297mm] w-full rounded-2xl bg-white text-gray-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
        <Template draft={draft} />
      </div>
    </div>
  );
};

export default CvPreview;
