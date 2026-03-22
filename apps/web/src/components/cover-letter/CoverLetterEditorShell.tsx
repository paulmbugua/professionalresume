import React, { useMemo } from 'react';
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
  exportUrl?: string;
  isSaving: boolean;
  isExporting?: boolean;
  lastSavedAt?: string;
};

const CoverLetterEditorShell: React.FC<Props> = ({
  draft,
  onSave,
  onExport,
  onCopyExportLink,
  exportUrl,
  isSaving,
  isExporting,
  lastSavedAt,
}) => {
  const { control, setValue } = useFormContext<CoverLetterDraft>();
  const live = useWatch({ control });
  const previewDraft = useMemo(
    () => normalizeCoverLetterDraft((live ?? draft) as CoverLetterDraft),
    [live, draft]
  );

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-4 lg:px-8">
      <div className="sticky top-2 z-40 mb-4 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-400">
              Cover Letter Builder
            </p>
            <p className="text-xs text-gray-500">
              {lastSavedAt ? `Last saved ${lastSavedAt}` : 'Autosaving enabled'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={previewDraft.templateId}
              onChange={(e) =>
                setValue('templateId', e.target.value as CoverLetterDraft['templateId'], {
                  shouldDirty: true,
                })
              }
            >
              {coverLetterTemplateRegistry.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onExport}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
              disabled={Boolean(isExporting)}
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
            {exportUrl ? (
              <a
                href={exportUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
              >
                Download
              </a>
            ) : null}
            {exportUrl ? (
              <button
                type="button"
                onClick={onCopyExportLink}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
              >
                Copy link
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
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
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold"
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
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,450px)_1fr] min-h-0">
        <div className="space-y-4 print:hidden">
          <CoverLetterForm />
        </div>
        <div className="min-h-0">
          <div className="sticky top-24 h-[calc(100vh-8rem)] min-h-0 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <CoverLetterPreview draft={previewDraft} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterEditorShell;
