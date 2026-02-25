import React, { useMemo } from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import { resolvePreviewDraft } from '../../templates/demoResume';
import { templateRegistryById, templateRegistry } from '../../templates/registry';
import { stripScripts } from '../../utils/sanitizeHtmlForIframe';

type Props = {
  draft: CvDraft;
  showLiveBadge?: boolean;
  resumeSourceHint?: 'saved' | 'demo' | 'live';
};

const CvPreview: React.FC<Props> = ({ draft, showLiveBadge = false, resumeSourceHint }) => {
  const resolved = resolvePreviewDraft(draft);
  const previewDraft = useMemo(
    () => ({
      ...resolved.draft,
      typography: { ...(resolved.draft.typography || {}), ...(draft.typography || {}) },
      formatting: { ...(resolved.draft.formatting || {}), ...(draft.formatting || {}) },
      templateTheme: { ...(resolved.draft.templateTheme || {}), ...(draft.templateTheme || {}) },
      richText: { ...(resolved.draft.richText || {}), ...(draft.richText || {}) },
      sectionOrder: draft.sectionOrder || resolved.draft.sectionOrder,
      sectionVisibility: {
        ...(resolved.draft.sectionVisibility || {}),
        ...(draft.sectionVisibility || {}),
      },
    }),
    [resolved.draft, draft]
  );
  const resumeSource = resolved.resumeSource;

  const meta = templateRegistryById[previewDraft.templateId] || templateRegistry[0];
  const hasKnownTemplate = Boolean(meta?.component);
  const Template = hasKnownTemplate ? meta?.component : templateRegistry[0]?.component;

  const styleFingerprint = useMemo(
    () =>
      JSON.stringify({
        templateId: previewDraft.templateId,
        typography: previewDraft.typography,
        formatting: previewDraft.formatting,
        templateTheme: previewDraft.templateTheme,
        richText: previewDraft.richText,
        sectionOrder: previewDraft.sectionOrder,
        sectionVisibility: previewDraft.sectionVisibility,
      }),
    [
      previewDraft.templateId,
      previewDraft.typography,
      previewDraft.formatting,
      previewDraft.templateTheme,
      previewDraft.richText,
      previewDraft.sectionOrder,
      previewDraft.sectionVisibility,
    ]
  );

  const html = useMemo(() => {
    const htmlRenderer = meta?.renderHtml;
    return htmlRenderer ? stripScripts(htmlRenderer(previewDraft)) : null;
  }, [meta, previewDraft, styleFingerprint]);

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
              className={`h-2 w-2 rounded-full ${
                resumeSource === 'demo' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
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

      {!hasKnownTemplate && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Unknown template id <span className="font-semibold">{previewDraft.templateId}</span>.
          Falling back to{' '}
          <span className="font-semibold">{templateRegistry[0]?.id ?? 'first template'}</span>.
        </div>
      )}

      <div className="cv-page h-full min-h-0 w-full overflow-hidden rounded-2xl bg-white text-gray-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
        {html ? (
          <iframe
            key={`${previewDraft.templateId}:${styleFingerprint}`}
            title={`CV preview ${resumeSourceHint || resumeSource}`}
            srcDoc={html}
            sandbox="allow-same-origin"
            className="h-full w-full"
            style={{ border: 0 }}
          />
        ) : Template ? (
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
