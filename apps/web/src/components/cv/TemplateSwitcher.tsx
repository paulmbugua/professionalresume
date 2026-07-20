import React from 'react';
import { useFormContext } from 'react-hook-form';
import type { CvDraft } from '@cvpro/shared/types';
import { demoResume } from '../../templates/demoResume';
import { templateRegistry, templateRegistryById } from '../../templates/registry';
import { normalizeDraft } from '../../utils/cvDefaults';
import TemplateThumbnail from './templates/TemplateThumbnail';

type Props = {
  currentTemplateId: string;
};

const TemplateSwitcher: React.FC<Props> = ({ currentTemplateId }) => {
  const { setValue } = useFormContext<CvDraft>();
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');

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

  const chooseTemplate = (templateId: string) => {
    setValue('templateId', templateId as any, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary hover:text-primary sm:col-span-1 dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        Change template
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
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 flex w-full max-w-5xl">
            <div className="ml-auto flex h-full w-full flex-col border-l border-slate-200 bg-slate-50 shadow-2xl dark:border-white/10 dark:bg-slate-950">
              <div className="border-b border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                      Live template studio
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                      Switch resume design in real time
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/60">
                      Current: {activeTemplate?.name || currentTemplateId}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,320px)_1fr]">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search templates"
                    className="input bg-white dark:bg-white/5"
                  />
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
                    const previewHtml = template.renderHtml?.(demoDraft);

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => chooseTemplate(template.id)}
                        className={`group overflow-hidden rounded-2xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-white/5 ${
                          isActive
                            ? 'border-primary ring-2 ring-primary/25'
                            : 'border-slate-200 hover:border-primary/60 dark:border-white/10'
                        }`}
                      >
                        <TemplateThumbnail html={previewHtml} label={template.name} />
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
                            {isActive ? 'Active' : 'Use'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemplateSwitcher;
