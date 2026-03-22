'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCreateCoverLetterDraft } from '@cvpro/shared/hooks';

import TemplateThumbnail from '../components/cv/templates/TemplateThumbnail';
import { coverLetterTemplateRegistry } from '../templates/coverLetterRegistry';
import { EMPTY_COVER_LETTER_DRAFT } from '../utils/coverLetterDefaults';

const CoverLetterTemplatesPage: React.FC = () => {
  const router = useRouter();
  const { backendUrl, token } = useShopContext() as { backendUrl?: string; token?: string | null };
  const createDraft = useCreateCoverLetterDraft({ backendUrl: backendUrl || '', token: token || '' });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    coverLetterTemplateRegistry[0]?.id || 'classic-letter'
  );

  const selectedTemplate = useMemo(
    () =>
      coverLetterTemplateRegistry.find((template) => template.id === selectedTemplateId) ||
      coverLetterTemplateRegistry[0],
    [selectedTemplateId]
  );

  const handleUseTemplate = async (templateId: string) => {
    const destination = `/cover-letters/templates?templateId=${encodeURIComponent(templateId)}`;
    if (!token) {
      router.push(`/login?returnTo=${encodeURIComponent(destination)}`);
      return;
    }
    if (!backendUrl) return;

    const template = coverLetterTemplateRegistry.find((item) => item.id === templateId);
    const draft = await createDraft.mutateAsync({
      templateId,
      title: template?.name || 'Untitled Cover Letter',
      data: {
        ...EMPTY_COVER_LETTER_DRAFT,
        templateId,
      },
    });

    router.push(`/cover-letters/editor/${draft.id}`);
  };

  return (
    <main className="min-h-screen bg-site pb-12 pt-8 text-slate-900 dark:text-white">
      <section className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
            Cover letter templates
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Explore designs for your cover letter
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
            Select a layout, preview it, and launch directly into the dedicated cover-letter editor.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">
            Selected template
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTemplate?.name}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-white/70">
                {selectedTemplate?.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectedTemplate && handleUseTemplate(selectedTemplate.id)}
              disabled={createDraft.isPending || !backendUrl}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createDraft.isPending ? 'Creating...' : 'Use this template'}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {coverLetterTemplateRegistry.map((template) => {
            const previewHtml = template.renderHtml({
              ...EMPTY_COVER_LETTER_DRAFT,
              templateId: template.id,
              title: template.name,
              sender: {
                ...EMPTY_COVER_LETTER_DRAFT.sender,
                fullName: 'Jane Applicant',
                email: 'jane@example.com',
                phone: '(555) 010-2233',
                location: 'New York, NY',
              },
              recipient: {
                ...EMPTY_COVER_LETTER_DRAFT.recipient,
                name: 'Hiring Manager',
                title: 'Talent Acquisition',
                company: 'CVPro Inc',
              },
              letter: {
                ...EMPTY_COVER_LETTER_DRAFT.letter,
                role: 'Product Designer',
                subject: 'Application for Product Designer',
                date: new Date().toLocaleDateString(),
              },
              body: {
                opening: 'I am excited to apply for the Product Designer role at CVPro.',
                middleParagraphs: [
                  'I have designed and shipped user-focused experiences that improved conversion and retention.',
                ],
                closing:
                  'I would welcome the opportunity to discuss how my background can support your product goals.',
              },
            });

            const isSelected = selectedTemplateId === template.id;

            return (
              <article
                key={template.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-white/5 ${
                  isSelected
                    ? 'border-primary/60 ring-2 ring-primary/20 dark:border-primary/60'
                    : 'border-gray-200 dark:border-white/10'
                }`}
              >
                <button type="button" onClick={() => setSelectedTemplateId(template.id)} className="w-full text-left">
                  <TemplateThumbnail html={previewHtml} label={template.name} />
                </button>

                <div className="mt-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-white/60">
                    {template.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-slate-200">
                      {template.category}
                    </span>
                    {template.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 dark:border-white/15 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUseTemplate(template.id)}
                    disabled={createDraft.isPending || !backendUrl}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Use Template
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};

export default CoverLetterTemplatesPage;
