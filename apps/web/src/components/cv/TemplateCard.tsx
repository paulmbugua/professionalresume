import React from 'react';
import type { CvTemplate } from '@mytutorapp/shared/types';

type Props = {
  template: CvTemplate;
  onSelect: (template: CvTemplate) => void;
};

const TemplateCard: React.FC<Props> = ({ template, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group text-left rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
    >
      <div className="aspect-[4/3] rounded-xl border border-dashed border-gray-200 bg-gradient-to-br from-white to-softGray p-3 text-sm text-gray-500 shadow-inner dark:border-white/10 dark:from-white/5 dark:to-darkCard">
        <div className="flex h-full flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white/60">
            {template.category}
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold text-gray-900 dark:text-white">
              {template.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-white/60">
              {template.isAtsFriendly ? 'ATS friendly' : 'Visual-forward layout'}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{template.name}</p>
          <p className="text-xs text-gray-500 dark:text-white/60">
            {template.isAtsFriendly ? 'Optimized for ATS' : 'Designed for visual impact'}
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition group-hover:bg-primary group-hover:text-white">
          Choose
        </span>
      </div>
    </button>
  );
};

export default TemplateCard;
