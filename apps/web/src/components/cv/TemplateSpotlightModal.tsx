'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import { demoResume } from '../../templates/demoResume';
import { templateRegistryById } from '../../templates/registry';
import { withPreviewEnhancements } from '../../utils/cvHtmlEnhance';

type TemplateLite = { id: string; name?: string; description?: string };

type Props = {
  isOpen: boolean;
  template: TemplateLite | null;
  onClose: () => void;
  onContinue: (templateId: string) => void;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// One-page height used by your templates (matches your BASE_H in thumbnails)
const ONE_PAGE_HEIGHT_PX = 1130;

const TemplateSpotlightModal: React.FC<Props> = ({ isOpen, template, onClose, onContinue }) => {
  const [scale, setScale] = useState(1);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Reset zoom each open
  useEffect(() => {
    if (isOpen) setScale(1);
  }, [isOpen, template?.id]);

  const templateMeta = template?.id ? templateRegistryById[template.id] : undefined;
  const TemplateComponent = templateMeta?.component;

  const previewDraft: CvDraft = useMemo(() => {
    return {
      ...demoResume,
      templateId: template?.id ?? demoResume.templateId,
      title: demoResume.title,
    };
  }, [template?.id]);

  const previewHtml = useMemo(() => {
    if (!templateMeta?.renderHtml || !template?.id) return null;

    const raw = templateMeta.renderHtml(previewDraft);

    // ✅ Modal should show ONE page only and should NOT autosize
    // - injectAutosize:false prevents height growth loop
    // - screenOnePageOnly:true clamps screen rendering to one page
    return withPreviewEnhancements(
      raw,
      previewDraft,
      { templateId: template.id },
      { injectAutosize: false, screenOnePageOnly: true }
    );
  }, [templateMeta, previewDraft, template?.id]);

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div className="relative h-[92vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl dark:bg-[#0B0F19]">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/70 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">
                Template preview
              </p>
              <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {template.name ?? template.id}
              </h3>
              {template.description ? (
                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-white/60">
                  {template.description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Zoom controls */}
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                <button
                  type="button"
                  onClick={() => setScale((s) => clamp(Number((s - 0.1).toFixed(2)), 0.7, 1.3))}
                  className="rounded-full px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  −
                </button>
                <span className="min-w-[52px] text-center">{Math.round(scale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setScale((s) => clamp(Number((s + 0.1).toFixed(2)), 0.7, 1.3))}
                  className="rounded-full px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  +
                </button>
              </div>

              {/* Actions */}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => onContinue(template.id)}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="grid h-[calc(92vh-56px-34px)] min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Big preview */}
            <div className="h-full min-h-0 overflow-auto bg-gradient-to-b from-gray-50 to-white p-3 sm:p-4 dark:from-black/20 dark:to-black/10">
              <div className="inline-block origin-top-left pb-10" style={{ transform: `scale(${scale})` }}>
                <div className="min-w-[860px]">
                  <div className="overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)]">
                    {previewHtml ? (
                      <iframe
                        title={`${template.name ?? template.id} preview`}
                        srcDoc={previewHtml}
                        sandbox="allow-same-origin"
                        // ✅ no autosize, no infinite scroll: lock to one page height
                        scrolling="no"
                        className="w-full"
                        style={{ height: ONE_PAGE_HEIGHT_PX, width: '100%', border: 0, background: '#fff' }}
                      />
                    ) : TemplateComponent ? (
                      <TemplateComponent draft={previewDraft} />
                    ) : (
                      <div className="p-6 text-sm text-rose-500">
                        Template component not found for <b>{template.id}</b>.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Side panel */}
            <div className="hidden h-full border-l border-gray-200 bg-white/80 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5 lg:block">
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                    What you’re seeing
                  </p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-white/80">
                    This is a one-page preview using our demo resume. When you continue, you’ll start editing and
                    your details will replace the demo content in real time.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                    Controls
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-gray-700 dark:text-white/80">
                    <li>• Use zoom (top-right)</li>
                    <li>• Press Esc to close</li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => onContinue(template.id)}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  Continue with {template.name ?? 'this template'}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                >
                  Keep browsing
                </button>
              </div>
            </div>
          </div>

          {/* Bottom hint (mobile) */}
          <div className="border-t border-gray-200 bg-white/70 px-4 py-2 text-[11px] text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/60 lg:hidden">
            Tip: Use zoom (top-right). Tap Continue to start editing.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSpotlightModal;