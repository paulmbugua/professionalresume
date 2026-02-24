import React, { useMemo } from 'react';
import type { CvTemplate } from '@cvpro/shared/types';
import { demoResume } from '../../templates/demoResume';
import { normalizeDraft } from '../../utils/cvDefaults';
import TemplateThumbnail from './templates/TemplateThumbnail';
import { templateRegistryById } from '../../templates/registry';

type Props = {
  template: CvTemplate;
  onSelect: (template: CvTemplate) => void;
};

const TemplateCard: React.FC<Props> = ({ template, onSelect }) => {
  const thumbnailHtml = useMemo(() => {
    const demoDraft = normalizeDraft({ ...demoResume, templateId: template.id });
    return templateRegistryById[template.id]?.renderHtml?.(demoDraft);
  }, [template.id]);

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className="group text-left rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
    >
      <TemplateThumbnail html={thumbnailHtml} label={template.name} />
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
