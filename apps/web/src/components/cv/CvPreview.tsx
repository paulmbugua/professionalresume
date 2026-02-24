import React from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import { resolvePreviewDraft } from '../../templates/demoResume';
import { templateRegistryById, templateRegistry } from '../../templates/registry';

type Props = {
  draft: CvDraft;
};

const CvPreview: React.FC<Props> = ({ draft }) => {
  const importMetaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const isDev =
    importMetaEnv?.DEV ??
    (typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false);
  const { draft: previewDraft, resumeSource } = resolvePreviewDraft(draft);
  if (isDev && resumeSource === 'demo') {
    console.warn('[CvPreview] draft missing content; rendering demo resume data.');
  }

  const Template =
    templateRegistryById[previewDraft.templateId]?.component ||
    templateRegistry[0]?.component;

  return (
    <div className="cv-preview-wrapper mx-auto w-full max-w-[820px]">
      {resumeSource === 'demo' && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Showing demo resume data. Add your details to replace this preview.
        </div>
      )}
      <div className="cv-page min-h-[297mm] w-full rounded-2xl bg-white text-gray-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
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
