'use client';

import React from 'react';
import type { CvDraft } from '@mytutorapp/shared/types';

type Props = {
  draft: CvDraft;
  templateCount: number;
  templateSource: 'api' | 'local' | 'unknown';
  resumeSource: 'saved' | 'demo';
  apiError?: string;
};

const TemplateDebugPanel: React.FC<Props> = ({
  draft,
  templateCount,
  templateSource,
  resumeSource,
  apiError,
}) => {
  const importMetaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const isDev =
    importMetaEnv?.DEV ??
    (typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false);
  if (!isDev) return null;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-600 shadow-sm">
      <p className="font-semibold text-slate-700">Template debug</p>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        <div>
          <span className="font-semibold">Active template:</span> {draft.templateId}
        </div>
        <div>
          <span className="font-semibold">Template count:</span> {templateCount}
        </div>
        <div>
          <span className="font-semibold">Template source:</span> {templateSource}
        </div>
        <div>
          <span className="font-semibold">Resume source:</span> {resumeSource}
        </div>
        <div>
          <span className="font-semibold">Resume keys:</span>{' '}
          {Object.keys(draft || {}).slice(0, 6).join(', ')}
        </div>
        <div>
          <span className="font-semibold">Sections:</span>{' '}
          {(draft.sectionOrder || []).join(', ') || 'none'}
        </div>
        <div className="sm:col-span-2">
          <span className="font-semibold">Last API error:</span>{' '}
          {apiError || 'none'}
        </div>
      </div>
    </div>
  );
};

export default TemplateDebugPanel;
