'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useShopContext } from '@cvpro/shared/context';
import { useCreateCoverLetterDraft } from '@cvpro/shared/hooks';

import TemplateThumbnail from '../components/cv/templates/TemplateThumbnail';
import { coverLetterTemplateRegistry } from '../templates/coverLetterRegistry';
import { trackBuilderStarted, trackCoverLetterTemplateSelect } from '../lib/analytics/events';

function getDraftIdentifier(draft: unknown): string | null {
  if (!draft || typeof draft !== 'object') return null;
  const candidate = draft as Record<string, unknown>;
  if (typeof candidate.id === 'string' && candidate.id.trim()) return candidate.id;
  if (typeof candidate.draftId === 'string' && candidate.draftId.trim()) return candidate.draftId;
  if (candidate.data && typeof candidate.data === 'object') {
    const nested = candidate.data as Record<string, unknown>;
    if (typeof nested.id === 'string' && nested.id.trim()) return nested.id;
    if (typeof nested.draftId === 'string' && nested.draftId.trim()) return nested.draftId;
  }
  return null;
}

const CoverLetterTemplatesPage: React.FC = () => {
  const router = useRouter();
  const { backendUrl, token } = useShopContext() as { backendUrl?: string; token?: string | null };
  const createDraft = useCreateCoverLetterDraft({
    backendUrl: backendUrl || '',
    token: token || '',
  });

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
    const selected = coverLetterTemplateRegistry.find((item) => item.id === templateId);
    trackCoverLetterTemplateSelect({ template_id: templateId, template_name: selected?.name, source_page: 'cover_letters_templates' });
    const destination = `/cover-letters/templates?templateId=${encodeURIComponent(templateId)}`;
    if (!token) {
      router.push(`/login?returnTo=${encodeURIComponent(destination)}`);
      return;
    }
    if (!backendUrl) return;

    const template = coverLetterTemplateRegistry.find((item) => item.id === templateId);
    const draft = await createDraft.mutateAsync({
      templateKey: templateId,
      title: template?.name || 'Untitled Cover Letter',
      data: {
        applicantName: '',
        applicantEmail: '',
        applicantPhone: '',
        applicantLocation: '',
        recipientName: '',
        companyName: '',
        roleTitle: '',
        letterBody: '',
        closingLine: '',
      },
    });

    const draftId = getDraftIdentifier(draft);
    if (draftId) {
      trackBuilderStarted({ source_page: 'cover_letters_templates', template_id: templateId, template_name: template?.name, product_type: 'cover_letter' });
      router.push(`/cover-letters/editor/${draftId}`);
      return;
    }

    router.push('/cover-letters');
  };

  return (
    <main className="min-h-screen bg-site pb-12 pt-8 text-slate-900 dark:text-white">
      <section className="mx-auto w-full max-w-screen-2xl px-4 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-white/20 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-white/80">
            Cover letter templates
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Explore designs for your cover letter
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-white/80 sm:text-base">
            Select a layout, preview it, and launch directly into the dedicated cover-letter editor.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/20 dark:bg-slate-900/75">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/80">
            Selected template
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {selectedTemplate?.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-white/80">
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
              templateId: template.id,
              templateKey: template.id,
              title: template.name,
              applicantName: 'Jane Applicant',
              applicantTitle: 'Senior Product Designer',
              applicantEmail: 'jane@example.com',
              applicantPhone: '(555) 010-2233',
              applicantLocation: 'New York, NY',
              recipientName: 'Alex Morgan',
              recipientTitle: 'Talent Acquisition Manager',
              companyName: 'CVPro Inc',
              companyAddress: '123 Market Street, New York, NY',
              roleTitle: 'Product Designer',
              dateText: new Date().toLocaleDateString(),
              subjectLine: 'Application for Product Designer',
              greeting: 'Dear Hiring Manager,',
              letterBody:
                'I am excited to apply for the Product Designer role at CVPro.\n\nI have designed and shipped user-focused experiences that improved conversion and retention.',
              closingParagraph:
                'I would welcome the opportunity to discuss how my background can support your product goals.',
              closingLine: 'Sincerely,',
              signatureName: 'Jane Applicant',
              fontFamily: 'Inter, system-ui, Arial, sans-serif',
              fontSize: 12,
              lineHeight: 1.55,
              accentColor: '#2563eb',
              pageTheme: 'light',
            });

            const isSelected = selectedTemplateId === template.id;

            return (
              <article
                key={template.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900/75 ${
                  isSelected
                    ? 'border-primary/60 ring-2 ring-primary/20 dark:border-primary/60'
                    : 'border-slate-200 dark:border-white/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedTemplateId(template.id)}
                  className="w-full text-left"
                >
                  <TemplateThumbnail html={previewHtml} label={template.name} />
                </button>

                <div className="mt-4">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {template.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-white/80">
                    {template.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-900/70 dark:text-white/80">
                      {template.category}
                    </span>
                    {template.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 dark:border-white/20 dark:text-white/80"
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
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-white/20 dark:bg-slate-900/70 dark:text-white/85"
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
