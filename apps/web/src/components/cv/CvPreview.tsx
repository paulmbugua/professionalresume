import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import { resolvePreviewDraft } from '../../templates/demoResume';
import { templateRegistryById, templateRegistry } from '../../templates/registry';

type Props = {
  draft: CvDraft;
  showLiveBadge?: boolean;
};

const CvPreview: React.FC<Props> = ({ draft, showLiveBadge = false }) => {
  const importMetaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const isDev =
    importMetaEnv?.DEV ??
    (typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false);
  const { draft: previewDraft, resumeSource } = resolvePreviewDraft(draft);
  if (isDev && resumeSource === 'demo') {
    console.warn('[CvPreview] draft missing content; rendering demo resume data.');
  }

  const Template =
    templateRegistryById[previewDraft.templateId]?.component || templateRegistry[0]?.component;

  return (
    <div className="cv-preview-wrapper h-full min-h-0 w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {showLiveBadge ? (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
              resumeSource === 'demo'
                ? 'border border-amber-200 bg-amber-50 text-amber-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${resumeSource === 'demo' ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
            {resumeSource === 'demo' ? 'DEMO PREVIEW' : 'LIVE PREVIEW'}
          </span>
        ) : (
          <span />
        )}
        {resumeSource === 'demo' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Showing demo resume data. Add your details to replace this preview.
          </div>
        )}
      </div>

      <div className="cv-page h-full min-h-0 w-full overflow-hidden rounded-2xl bg-white text-gray-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
        {Template ? (
          <Template draft={previewDraft} />
        ) : (
          <div className="p-6 text-sm text-rose-500">
            <p className="font-semibold">Template not found.</p>
            <p className="mt-1 text-xs text-rose-600">
              Please return to the templates list and select a different layout.
            </p>
            <a
              href="/templates"
              className="mt-3 inline-flex rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white"
            >
              Back to templates
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default CvPreview;
