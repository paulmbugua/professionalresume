'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Sparkles, PenLine } from 'lucide-react';
import { useShopContext } from '@cvpro/shared/context';
import { useCreateCoverLetterDraft, useImportCoverLetterFile } from '@cvpro/shared/hooks';
import { coverLetterTemplateRegistry } from '../templates/coverLetterRegistry';

const acceptedTypes =
  'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx';

const cardBase =
  'rounded-2xl border border-slate-200 bg-white/95 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/70';

const CoverLetterNewPage: React.FC = () => {
  const router = useRouter();
  const { token, backendUrl } = useShopContext() as any;

  const createDraft = useCreateCoverLetterDraft({
    backendUrl: backendUrl || '',
    token: token || '',
  });
  const importFile = useImportCoverLetterFile({
    backendUrl: backendUrl || '',
    token: token || '',
  });

  const [templateId, setTemplateId] = useState<string>(coverLetterTemplateRegistry[0]?.id || 'classic-letter');
  const [activeImport, setActiveImport] = useState<'cover_letter' | 'resume' | null>(null);
  const [error, setError] = useState<string>('');

  const coverLetterInputRef = useRef<HTMLInputElement | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);

  const selectedTemplate = useMemo(
    () => coverLetterTemplateRegistry.find((template) => template.id === templateId),
    [templateId]
  );

  const ensureAuthed = () => {
    if (!token) {
      router.replace(`/login?returnTo=${encodeURIComponent('/cover-letters/new')}`);
      return false;
    }
    return true;
  };

  const startFromScratch = async () => {
    if (!ensureAuthed() || !backendUrl) return;
    setError('');

    const created = await createDraft.mutateAsync({
      templateKey: templateId,
      title: `Untitled ${selectedTemplate?.name || 'Cover Letter'}`,
      data: {
        greeting: 'Dear Hiring Manager,',
        closingLine: 'Sincerely,',
      } as any,
    });

    router.replace(`/cover-letters/editor/${created.id}`);
  };

  const runImport = async (file: File, sourceType: 'cover_letter' | 'resume') => {
    if (!ensureAuthed() || !backendUrl) return;

    setError('');
    setActiveImport(sourceType);

    try {
      const imported = await importFile.mutateAsync({ file, sourceType });
      const created = await createDraft.mutateAsync({
        templateKey: templateId,
        title:
          sourceType === 'resume'
            ? 'AI-assisted Cover Letter from Resume'
            : 'Imported Cover Letter Draft',
        data: imported.data,
      });

      router.replace(`/cover-letters/editor/${created.id}`);
    } catch (err: any) {
      setError(err?.message || 'Import failed. Please try another file.');
    } finally {
      setActiveImport(null);
      if (coverLetterInputRef.current) coverLetterInputRef.current.value = '';
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  };

  return (
    <main className="min-h-screen bg-site pb-14 pt-8 text-slate-900 dark:text-white">
      <section className="mx-auto w-full max-w-screen-xl px-4 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
            Create Cover Letter
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Choose how you want to start
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Start from a blank draft, upload an existing cover letter to improve, or upload a resume
            and let AI build a strong starter letter for you.
          </p>

          <div className="mt-5 max-w-sm">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              Template
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-950/60"
            >
              {coverLetterTemplateRegistry.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className={cardBase}>
            <div className="mb-3 inline-flex rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
              <PenLine className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold">Start from scratch</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Open the editor with a clean draft and your selected template.
            </p>
            <button
              type="button"
              onClick={startFromScratch}
              disabled={createDraft.isPending || !!activeImport}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {createDraft.isPending && !activeImport ? 'Creating…' : 'Start Writing'}
            </button>
          </article>

          <article className={cardBase}>
            <div className="mb-3 inline-flex rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
              <FileText className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold">Upload Cover Letter</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Import an existing letter and let AI separate it into editable sections.
            </p>
            <button
              type="button"
              onClick={() => coverLetterInputRef.current?.click()}
              disabled={createDraft.isPending || !!activeImport}
              className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-60"
            >
              {activeImport === 'cover_letter' ? 'Importing…' : 'Upload Cover Letter'}
            </button>
            <input
              ref={coverLetterInputRef}
              type="file"
              accept={acceptedTypes}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void runImport(file, 'cover_letter');
              }}
            />
          </article>

          <article className={cardBase}>
            <div className="mb-3 inline-flex rounded-lg bg-violet-100 p-2 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold">Upload Resume for AI Assist</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Reuse your resume details, then generate a persuasive draft body automatically.
            </p>
            <button
              type="button"
              onClick={() => resumeInputRef.current?.click()}
              disabled={createDraft.isPending || !!activeImport}
              className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white disabled:opacity-60"
            >
              {activeImport === 'resume' ? 'Extracting…' : 'Upload Resume'}
            </button>
            <input
              ref={resumeInputRef}
              type="file"
              accept={acceptedTypes}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void runImport(file, 'resume');
              }}
            />
          </article>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-xs text-slate-600 dark:border-white/20 dark:bg-slate-900/60 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Upload className="h-3.5 w-3.5" />
            Supports PDF and DOCX up to 8MB.
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
};

export default CoverLetterNewPage;
