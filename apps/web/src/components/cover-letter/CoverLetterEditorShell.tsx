'use client';

import React, { useMemo, useState } from 'react';
import { FileText, FileUp, Minus, Plus, Sparkles, Type } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { CoverLetterDraft } from '@cvpro/shared/types';
import CoverLetterForm from './CoverLetterForm';
import CoverLetterPreview from './CoverLetterPreview';
import { normalizeCoverLetterDraft } from '../../utils/coverLetterDefaults';
import { trackAiAssistUsed } from '../../lib/analytics/events';

type Props = {
  draft: CoverLetterDraft;
  onSave: () => void;
  onExport: () => void;
  onCopyExportLink: () => void;
  onPrint: () => void;
  exportUrl?: string;
  isSaving: boolean;
  isExporting?: boolean;
  lastSavedAt?: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  onImportCoverLetter?: () => void;
  onImportResume?: () => void;
  isImporting?: boolean;
  importNotice?: string;
};

const CoverLetterEditorShell: React.FC<Props> = ({
  draft,
  onSave,
  onExport,
  onCopyExportLink,
  onPrint,
  exportUrl,
  isSaving,
  isExporting,
  lastSavedAt,
  saveState = 'idle',
  onImportCoverLetter,
  onImportResume,
  isImporting,
  importNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const { control, setValue } = useFormContext<CoverLetterDraft>();
  const live = useWatch({ control });

  const previewDraft = useMemo(
    () => normalizeCoverLetterDraft((live ?? draft) as CoverLetterDraft),
    [live, draft]
  );

  const subjectText = previewDraft.letter.subject?.trim() ?? '';
  const bodyText = [previewDraft.body.opening, ...previewDraft.body.middleParagraphs]
    .filter(Boolean)
    .join('\n\n')
    .trim();
  const closingText = previewDraft.body.closing?.trim() ?? '';
  const fontSize = Math.round(previewDraft.style.fontSize || 15);

  const setFontSize = (nextSize: number) => {
    const clamped = Math.min(24, Math.max(10, nextSize));
    setValue('style.fontSize', clamped, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleImproveOpening = () => {
    trackAiAssistUsed({
      source_page: 'cover_letter_builder',
      feature: 'improve_opening',
    });

    const openingIntro =
      'I am excited to apply for this opportunity and believe my experience makes me a strong fit.';

    const currentOpening = previewDraft.body.opening?.trim() ?? '';
    const nextOpening = currentOpening || openingIntro;
    setValue('body.opening', nextOpening, { shouldDirty: true });
  };

  const handleStrongerClose = () => {
    trackAiAssistUsed({
      source_page: 'cover_letter_builder',
      feature: 'stronger_close',
    });

    const strongerClose =
      'Thank you for your time and consideration. I would welcome the opportunity to discuss how I can contribute.';

    const nextClosing = closingText.includes(strongerClose)
      ? closingText
      : [closingText, strongerClose].filter(Boolean).join('\n\n');

    setValue('body.closing', nextClosing, { shouldDirty: true });
  };

  return (
    <div className="mx-auto w-full max-w-screen-2xl overflow-x-clip px-4 pb-10 pt-4 text-slate-900 dark:text-white lg:px-8">
      <div className="sticky top-2 z-40 mb-4 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur print:hidden dark:border-white/10 dark:bg-[#0B1220]/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
              Cover Letter Builder
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {lastSavedAt ? `Last saved ${lastSavedAt}` : 'Autosaving enabled'}
            </p>
            <p
              className={`text-xs font-semibold ${
                saveState === 'saved'
                  ? 'text-emerald-600'
                  : saveState === 'saving'
                    ? 'text-blue-600'
                    : saveState === 'error'
                      ? 'text-rose-600'
                      : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {saveState === 'saved'
                ? 'Saved'
                : saveState === 'saving'
                  ? 'Saving...'
                  : saveState === 'error'
                    ? 'Failed to save'
                    : 'Unsaved changes'}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm dark:border-white/10 dark:bg-white/5">
              <Type className="h-4 w-4 text-slate-500 dark:text-slate-300" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setFontSize(fontSize - 1)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Decrease cover letter font size"
                title="Decrease font size"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="min-w-12 text-center text-xs font-bold tabular-nums text-slate-700 dark:text-slate-100">
                {fontSize}px
              </div>
              <button
                type="button"
                onClick={() => setFontSize(fontSize + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Increase cover letter font size"
                title="Increase font size"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={onPrint}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-primary dark:hover:text-primary"
            >
              Print
            </button>

            <button
              type="button"
              onClick={onExport}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-primary dark:hover:text-primary"
              disabled={Boolean(isExporting)}
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>

            {exportUrl ? (
              <a
                href={exportUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-primary dark:hover:text-primary"
              >
                Download
              </a>
            ) : null}

            {exportUrl ? (
              <button
                type="button"
                onClick={onCopyExportLink}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-primary dark:hover:text-primary"
              >
                Copy link
              </button>
            ) : null}

            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-primary dark:hover:text-primary"
              onClick={handleImproveOpening}
            >
              AI: Improve opening
            </button>

            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-primary dark:hover:text-primary"
              onClick={handleStrongerClose}
            >
              AI: Stronger close
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>

            {onImportCoverLetter || onImportResume ? (
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-cyan-300 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-950 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-50 dark:hover:bg-cyan-400/20">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-600 text-white shadow-sm dark:bg-cyan-400 dark:text-cyan-950">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span>{isImporting ? 'Importing...' : 'Import / AI Assist'}</span>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-200">
                    Smart
                  </span>
                </summary>

                <div className="absolute left-0 right-0 z-50 mt-2 min-w-[260px] overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:left-auto sm:right-0 dark:border-white/10 dark:bg-slate-900">
                  {onImportCoverLetter ? (
                    <button
                      type="button"
                      onClick={onImportCoverLetter}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-cyan-50 dark:hover:bg-cyan-400/10"
                    >
                      <FileText className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                          Upload cover letter
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-300">
                          Fill this draft from an existing letter
                        </span>
                      </span>
                    </button>
                  ) : null}

                  {onImportResume ? (
                    <button
                      type="button"
                      onClick={onImportResume}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-cyan-50 dark:hover:bg-cyan-400/10"
                    >
                      <FileUp className="h-4 w-4 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                          Build from resume
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-slate-300">
                          Extract details and let AI map the letter
                        </span>
                      </span>
                    </button>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </div>

        {importNotice ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-300">{importNotice}</p>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2 xl:hidden print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            activeTab === 'edit'
              ? 'bg-primary text-white'
              : 'bg-white text-slate-700 dark:bg-white/10 dark:text-slate-100'
          }`}
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            activeTab === 'preview'
              ? 'bg-primary text-white'
              : 'bg-white text-slate-700 dark:bg-white/10 dark:text-slate-100'
          }`}
        >
          Preview
        </button>
      </div>

      <div className="grid min-h-0 gap-6 xl:grid-cols-[minmax(340px,470px)_minmax(0,1fr)]">
        <div
          className={`${activeTab === 'preview' ? 'hidden' : 'block'} min-w-0 space-y-4 xl:block print:hidden`}
        >
          <CoverLetterForm />
        </div>

        <div className={`${activeTab === 'edit' ? 'hidden' : 'block'} min-h-0 min-w-0 xl:block`}>
          <div className="h-[70vh] min-h-0 xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)]">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/95 p-3 shadow-sm dark:border-white/10 dark:bg-[#0B1220]/75">
              <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-300">
                <span>Live preview</span>
                <span className="truncate">
                  {subjectText ? `Subject: ${subjectText}` : 'Draft preview'}
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/60 dark:border-white/10 dark:bg-slate-950/40">
                <CoverLetterPreview draft={previewDraft} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterEditorShell;
