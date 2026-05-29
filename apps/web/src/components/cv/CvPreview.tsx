'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import { resolvePreviewDraft } from '../../templates/demoResume';
import { templateRegistryById, templateRegistry } from '../../templates/registry';
import { stripScripts } from '../../utils/sanitizeHtmlForIframe';
import { PREVIEW_MAX_HEIGHT, withPreviewEnhancements } from '../../utils/cvHtmlEnhance';
import { normalizeSectionOrder, normalizeSectionVisibility } from '../../utils/cvDefaults';

type Props = {
  draft: CvDraft;
  showLiveBadge?: boolean;
  resumeSourceHint?: 'saved' | 'demo' | 'live';
  restoredScrollY?: number;
};

const hasPdfJunk = (draft: CvDraft) => {
  const sample = [
    draft?.summary,
    draft?.basics?.name,
    draft?.basics?.headline,
    ...(draft?.skills || []).slice(0, 20),
    ...(draft?.experience || []).flatMap((item) => [
      item.role,
      item.company,
      ...(item.bullets || []),
    ]),
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 6000);

  const markers = [
    '%PDF-',
    ' obj',
    'endobj',
    'stream',
    'endstream',
    'xref',
    'trailer',
    'MediaBox',
    'ViewerPreferences',
    'StructParents',
  ];
  const hits = markers.reduce((acc, marker) => {
    const m = sample.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
    return acc + (m?.length || 0);
  }, 0);
  return hits >= 6;
};

const CvPreview: React.FC<Props> = ({
  draft,
  showLiveBadge = false,
  resumeSourceHint,
  restoredScrollY,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(1400);
  const resolved = resolvePreviewDraft(draft);
  const previewDraft = useMemo<CvDraft>(
    () =>
      ({
        ...resolved.draft,
        typography: { ...(resolved.draft.typography || {}), ...(draft.typography || {}) },
        formatting: { ...(resolved.draft.formatting || {}), ...(draft.formatting || {}) },
        templateTheme: { ...(resolved.draft.templateTheme || {}), ...(draft.templateTheme || {}) },
        richText: { ...(resolved.draft.richText || {}), ...(draft.richText || {}) },
        sectionOrder: normalizeSectionOrder(
          draft.sectionOrder || resolved.draft.sectionOrder,
          resolved.draft.sectionOrder
        ),
        sectionVisibility: normalizeSectionVisibility({
          ...(resolved.draft.sectionVisibility || {}),
          ...(draft.sectionVisibility || {}),
        }),
      }) as CvDraft,
    [resolved.draft, draft]
  );
  const resumeSource = resolved.resumeSource;
  const blockedDueToCorruption = hasPdfJunk(previewDraft);
  const previewBadgeLabel =
    resumeSource === 'demo'
      ? 'Demo content'
      : resumeSource === 'saved'
        ? 'Saved draft'
        : 'Imported / live';

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

  const shouldUseHtmlPreview = Boolean(meta?.renderHtml);

  const html = useMemo(() => {
    if (!shouldUseHtmlPreview) return null;
    const htmlRenderer = meta?.renderHtml;
    return htmlRenderer
      ? withPreviewEnhancements(
          stripScripts(htmlRenderer(previewDraft)),
          previewDraft,
          { templateId: previewDraft.templateId },
          { injectAutosize: true }
        )
      : null;
  }, [meta, previewDraft, shouldUseHtmlPreview, styleFingerprint]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    console.log('[CV_IMPORT_DEBUG] PREVIEW_RENDER_PAYLOAD', {
      name: previewDraft?.basics?.name,
      headline: previewDraft?.basics?.headline,
      email: previewDraft?.basics?.email,
      experience: previewDraft?.experience?.length || 0,
      education: previewDraft?.education?.length || 0,
      skills: previewDraft?.skills?.length || 0,
      languages: previewDraft?.extras?.languages?.length || 0,
    });
  }, [previewDraft]);

  useEffect(() => {
    if (typeof restoredScrollY !== 'number') return;
    let frameOne = 0;
    let frameTwo = 0;
    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = restoredScrollY;
      });
    });
    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
    };
  }, [restoredScrollY, html, iframeHeight]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data: any = e.data;
      if (!data || data.__cv_iframe_resize !== true) return;
      const height = Number(data.height);
      if (!Number.isFinite(height) || height < 500) return;
      setIframeHeight(Math.min(height + 24, PREVIEW_MAX_HEIGHT));
    };

    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

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
            {previewBadgeLabel}
          </span>
        ) : (
          <span />
        )}

        {resumeSource === 'demo' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Showing sample content. Upload a CV or edit fields to switch to your own data.
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

      <div
        ref={scrollRef}
        data-cv-preview-scroll
        className="cv-page h-full min-h-0 w-full overflow-auto rounded-2xl bg-white text-gray-900 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]"
      >
        {blockedDueToCorruption ? (
          <div className="p-6 text-sm text-rose-600">
            <p className="font-semibold">Imported resume data looks corrupted.</p>
            <p className="mt-1 text-xs text-rose-700">
              We detected PDF internal tokens in extracted content and blocked preview rendering to
              avoid showing invalid data. Please retry extraction with a text-based PDF or DOCX.
            </p>
          </div>
        ) : html ? (
          <iframe
            key={`${previewDraft.templateId}:${styleFingerprint}`}
            title={`CV preview ${resumeSourceHint || resumeSource}`}
            srcDoc={html}
            sandbox="allow-same-origin"
            scrolling="auto"
            className="w-full"
            style={{ border: 0, height: iframeHeight }}
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
