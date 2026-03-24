import React from 'react';
import type { CoverLetterDraft } from '@cvpro/shared/types';
import { coverLetterTemplateRegistryById } from '../../templates/coverLetterRegistry';

type Props = { draft: CoverLetterDraft };

const CoverLetterPreview: React.FC<Props> = ({ draft }) => {
  const template =
    coverLetterTemplateRegistryById[draft.templateId] ||
    coverLetterTemplateRegistryById['classic-letter'];
  const Template = template.component;
  return (
    <div className="h-full overflow-y-auto overflow-x-auto bg-slate-100/70 p-2 sm:p-3 dark:bg-slate-950/60">
      <div className="mx-auto flex min-h-full w-full min-w-0 max-w-[900px] items-start justify-center">
        <div className="w-full min-w-0 max-w-[794px] rounded-md border border-slate-300 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)] dark:border-slate-500/80 dark:shadow-[0_20px_55px_rgba(2,6,23,0.7)]">
          <Template draft={draft} />
        </div>
      </div>
    </div>
  );
};

export default CoverLetterPreview;
