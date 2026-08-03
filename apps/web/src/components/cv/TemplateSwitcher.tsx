import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Check, LayoutTemplate, Search, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { CvDraft } from '@cvpro/shared/types';
import { demoResume, resolvePreviewDraft } from '../../templates/demoResume';
import {
  templateRegistry,
  templateRegistryById,
  type TemplateMeta,
} from '../../templates/registry';
import { normalizeDraft } from '../../utils/cvDefaults';
import { withPreviewEnhancements } from '../../utils/cvHtmlEnhance';
import { stripScripts } from '../../utils/sanitizeHtmlForIframe';
import TemplateThumbnail from './templates/TemplateThumbnail';

type Props = {
  currentTemplateId: string;
  onTemplateSelected?: (templateId: string) => void;
};

const BASE_PREVIEW_WIDTH = 820;
const BASE_PREVIEW_HEIGHT = 1130;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const TemplateSwitcher: React.FC<Props> = ({ currentTemplateId, onTemplateSelected }) => {
  const { setValue, control } = useFormContext<CvDraft>();
  const liveDraft = useWatch({ control }) as CvDraft | undefined;
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');
  const [focusedTemplate, setFocusedTemplate] = React.useState<TemplateMeta | null>(null);
  const [zoom, setZoom] = React.useState(0.9);

  const activeTemplate = templateRegistryById[currentTemplateId] || templateRegistry[0];
  const categories = React.useMemo(
    () => [
      'All',
      ...Array.from(new Set(templateRegistry.map((item) => item.category).filter(Boolean))),
    ],
    []
  );

  const filteredTemplates = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return templateRegistry.filter((template) => {
      const categoryMatch = category === 'All' || template.category === category;
      const textMatch =
        !q ||
        [template.name, template.category, template.description, ...(template.tags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      return categoryMatch && textMatch;
    });
  }, [category, query]);

  const previewDraft = React.useMemo(() => {
    const draft = normalizeDraft({
      ...(liveDraft || demoResume),
      templateId: focusedTemplate?.id || currentTemplateId || demoResume.templateId,
    } as CvDraft);
    return resolvePreviewDraft(draft).draft;
  }, [currentTemplateId, focusedTemplate?.id, liveDraft]);

  const previewHtml = React.useMemo(() => {
    if (!focusedTemplate?.renderHtml) return null;
    return withPreviewEnhancements(
      stripScripts(focusedTemplate.renderHtml(previewDraft)),
      previewDraft,
      { templateId: focusedTemplate.id },
      { injectAutosize: false, screenOnePageOnly: true }
    );
  }, [focusedTemplate, previewDraft]);

  React.useEffect(() => {
    if (!isOpen) {
      setFocusedTemplate(null);
      setZoom(0.9);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!focusedTemplate) return;
    setZoom(0.9);
  }, [focusedTemplate?.id]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (focusedTemplate) {
        setFocusedTemplate(null);
        return;
      }
      setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedTemplate, isOpen]);

  const openTemplatePreview = (template: TemplateMeta) => {
    setFocusedTemplate(template);
  };

  const selectTemplate = (templateId: string) => {
    setValue('templateId', templateId as any, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    setFocusedTemplate(null);
    setIsOpen(false);
    onTemplateSelected?.(templateId);
  };

  const TemplateComponent = focusedTemplate?.component;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
        <LayoutTemplate className="h-4 w-4" aria-hidden />
        Template
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[85] print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Change resume template"
        >
          <button
            type="button"
            aria-label="Close template switcher"
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 flex w-full max-w-6xl">
            <div className="ml-auto flex h-full w-full flex-col border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-white/10 dark:bg-slate-950">
              <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                      Template Studio
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                      Choose a resume design
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                      Current: {activeTemplate?.name || currentTemplateId}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,320px)_1fr]">
                  <label className="relative block">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search templates"
                      className="input bg-white pl-9 dark:bg-white/5"
                    />
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {categories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                          category === item
                            ? 'border-primary bg-primary text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/75'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredTemplates.map((template) => {
                    const isActive = template.id === currentTemplateId;
                    const demoDraft = normalizeDraft({ ...demoResume, templateId: template.id });
                    const thumbnailHtml = template.renderHtml?.(demoDraft);

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => openTemplatePreview(template)}
                        className={`group overflow-hidden rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-white/5 ${
                          isActive
                            ? 'border-primary ring-2 ring-primary/25'
                            : 'border-slate-200 hover:border-primary/60 dark:border-white/10'
                        }`}
                      >
                        <TemplateThumbnail html={thumbnailHtml} label={template.name} />
                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {template.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                              {template.category} template
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                                : 'bg-slate-100 text-slate-700 transition group-hover:bg-primary group-hover:text-white dark:bg-white/10 dark:text-white/75'
                            }`}
                          >
                            {isActive ? 'Active' : 'View'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {focusedTemplate && (
            <div
              className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-sm sm:p-4"
              role="dialog"
              aria-modal="true"
              aria-label={`${focusedTemplate.name} template preview`}
            >
              <div className="flex h-[94vh] w-full max-w-7xl min-h-0 flex-col overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-slate-900 sm:px-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                      Inspect Template
                    </p>
                    <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white sm:text-lg">
                      {focusedTemplate.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-white/60">
                      {focusedTemplate.description || focusedTemplate.category}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
                      <button
                        type="button"
                        onClick={() =>
                          setZoom((value) => clamp(Number((value - 0.1).toFixed(2)), 0.55, 1.35))
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-white dark:text-white/80 dark:hover:bg-white/10"
                        aria-label="Zoom out"
                      >
                        <ZoomOut className="h-4 w-4" aria-hidden />
                      </button>
                      <span className="min-w-14 px-2 text-center text-xs font-semibold text-slate-600 dark:text-white/70">
                        {Math.round(zoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setZoom((value) => clamp(Number((value + 0.1).toFixed(2)), 0.55, 1.35))
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 transition hover:bg-white dark:text-white/80 dark:hover:bg-white/10"
                        aria-label="Zoom in"
                      >
                        <ZoomIn className="h-4 w-4" aria-hidden />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFocusedTemplate(null)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                      aria-label="Back to templates"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 bg-slate-100 dark:bg-slate-950 lg:grid-cols-[minmax(0,1fr)_310px]">
                  <div className="min-h-0 overflow-auto p-4 sm:p-6">
                    <div
                      className="mx-auto"
                      style={{
                        width: BASE_PREVIEW_WIDTH * zoom,
                        height: BASE_PREVIEW_HEIGHT * zoom + 32,
                      }}
                    >
                      <div
                        className="origin-top-left rounded-xl bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.6)]"
                        style={{
                          width: BASE_PREVIEW_WIDTH,
                          height: BASE_PREVIEW_HEIGHT,
                          transform: `scale(${zoom})`,
                        }}
                      >
                        {previewHtml ? (
                          <iframe
                            title={`${focusedTemplate.name} preview`}
                            srcDoc={previewHtml}
                            sandbox="allow-same-origin"
                            scrolling="no"
                            className="h-full w-full rounded-xl"
                            style={{ border: 0, background: '#fff' }}
                          />
                        ) : TemplateComponent ? (
                          <TemplateComponent draft={previewDraft} />
                        ) : (
                          <div className="p-6 text-sm text-rose-500">
                            Template preview unavailable.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <aside className="border-t border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900 lg:border-l lg:border-t-0">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Profile
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-white/75">
                            {focusedTemplate.category}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              focusedTemplate.isAtsFriendly
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200'
                                : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200'
                            }`}
                          >
                            {focusedTemplate.isAtsFriendly ? 'ATS friendly' : 'Visual'}
                          </span>
                        </div>
                      </div>

                      {focusedTemplate.tags?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {focusedTemplate.tags.slice(0, 6).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500 dark:border-white/10 dark:text-white/60"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                        <button
                          type="button"
                          onClick={() => selectTemplate(focusedTemplate.id)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
                        >
                          <Check className="h-4 w-4" aria-hidden />
                          Select
                        </button>
                        <button
                          type="button"
                          onClick={() => setFocusedTemplate(null)}
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                        >
                          Browse
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default TemplateSwitcher;
