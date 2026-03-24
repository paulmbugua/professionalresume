import React, { useMemo, useState } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import type { CoverLetterDraft } from '@cvpro/shared/types';
import CoverLetterForm from './CoverLetterForm';
import CoverLetterPreview from './CoverLetterPreview';
import { normalizeCoverLetterDraft } from '../../utils/coverLetterDefaults';
import { coverLetterTemplateRegistry } from '../../templates/coverLetterRegistry';

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

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-4 text-slate-900 dark:text-white lg:px-8">
      <div className="sticky top-2 z-40 mb-4 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur print:hidden dark:border-white/10 dark:bg-[#0B1220]/90">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
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
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [color-scheme:light] dark:border-white/15 dark:bg-slate-900 dark:text-white dark:[color-scheme:dark]"
              value={previewDraft.templateId}
              onChange={(e) =>
                setValue('templateId', e.target.value as CoverLetterDraft['templateId'], {
                  shouldDirty: true,
                })
              }
            >
              {coverLetterTemplateRegistry.map((template) => (
                <option
                  key={template.id}
                  value={template.id}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                >
                  {template.name}
                </option>
              ))}
            </select>
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
              onClick={() =>
                setValue(
                  'body.opening',
                  `I am excited to apply for the ${previewDraft.letter.role || 'role'} at ${previewDraft.recipient.company || 'your company'}.\n\n${previewDraft.body.opening}`.trim(),
                  { shouldDirty: true }
                )
              }
            >
              AI: Improve opening
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-primary dark:hover:text-primary"
              onClick={() =>
                setValue(
                  'body.closing',
                  `${previewDraft.body.closing}\n\nThank you for your consideration.`.trim(),
                  { shouldDirty: true }
                )
              }
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
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                  {isImporting ? 'Importing…' : 'Import / AI Assist'}
                </summary>
                <div className="absolute right-0 z-50 mt-2 min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900">
                  {onImportCoverLetter ? (
                    <button
                      type="button"
                      onClick={onImportCoverLetter}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      Upload cover letter
                    </button>
                  ) : null}
                  {onImportResume ? (
                    <button
                      type="button"
                      onClick={onImportResume}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      Re-extract from resume
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

      <div className="mb-4 flex gap-2 lg:hidden print:hidden">
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

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,450px)_1fr] min-h-0">
        <div
          className={`${activeTab === 'preview' ? 'hidden' : 'block'} space-y-4 lg:block print:hidden`}
        >
          <CoverLetterForm />
        </div>
        <div className={`${activeTab === 'edit' ? 'hidden' : 'block'} min-h-0 lg:block`}>
          <div className="sticky top-24 h-[calc(100vh-8rem)] min-h-0">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/95 p-3 shadow-sm dark:border-white/10 dark:bg-[#0B1220]/75">
              <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[11px] font-medium text-slate-500 dark:text-slate-300">
                <span>Live preview</span>
                <span className="truncate">Template: {previewDraft.templateId}</span>
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
