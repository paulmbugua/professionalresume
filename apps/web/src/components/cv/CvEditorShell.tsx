import React, { useEffect, useMemo, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import CvForm from './CvForm';
import CvPreview from './CvPreview';
import SectionManager from './SectionManager';
import AiAssistPanel from './AiAssistPanel';
import PrintExportButton from './PrintExportButton';
import TemplateErrorBoundary from './TemplateErrorBoundary';
import DesignFormattingPanel from './DesignFormattingPanel';
import { templateRegistryById, templateRegistryList } from '../../templates/registry';
import { resolvePreviewDraft } from '../../templates/demoResume';
import { normalizeDraft } from '../../utils/cvDefaults';

type Props = {
  draft: CvDraft;
  validationErrors: string[];
  onSave: () => void;
  onExport: () => void;
  onCopyExportLink: () => void;
  exportUrl?: string;
  isSaving: boolean;
  isExporting?: boolean;
  lastSavedAt?: string;
};

const CvEditorShell: React.FC<Props> = ({
  draft,
  validationErrors,
  onSave,
  onExport,
  onCopyExportLink,
  exportUrl,
  isSaving,
  isExporting,
  lastSavedAt,
}) => {
  const { setValue, control } = useFormContext<CvDraft>();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isDesignOpen, setIsDesignOpen] = useState(false);

  const watchedDraft = useWatch({ control }) as CvDraft | undefined;
  const liveDraft = useMemo(() => normalizeDraft((watchedDraft ?? draft) as CvDraft), [watchedDraft, draft]);

  const liveTitle = liveDraft.title || '';
  const liveTemplateId = liveDraft.templateId || draft.templateId;

  const templateMeta: any =
    templateRegistryById[liveTemplateId] || templateRegistryList.find((t: any) => t.id === liveTemplateId);

  const templateDisplayName =
    (templateMeta?.name as string) ||
    (templateMeta?.label as string) ||
    (templateMeta?.title as string) ||
    (templateMeta?.displayName as string) ||
    liveTemplateId;

  const headerTitle = liveTitle.trim() ? liveTitle.trim() : templateDisplayName;

  useEffect(() => {
    if (!isDesignOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDesignOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isDesignOpen]);

  useEffect(() => {
    if (liveTitle.trim()) return;
    if (!templateDisplayName) return;

    setValue('title', templateDisplayName, {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [liveTitle, templateDisplayName, setValue]);

  const handleSectionChange = (next: {
    sectionOrder: CvSectionKey[];
    sectionVisibility: Record<CvSectionKey, boolean>;
  }) => {
    setValue('sectionOrder', next.sectionOrder, { shouldDirty: true });
    setValue('sectionVisibility', next.sectionVisibility, { shouldDirty: true });
  };

  const handleAiJump = () => {
    setActiveTab('edit');
    const el = document.getElementById('ai-panel');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { resumeSource } = resolvePreviewDraft(liveDraft);

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-400">CV Builder</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{headerTitle}</h2>
          <p className="text-xs text-gray-500 dark:text-white/60">
            {lastSavedAt ? `Last saved ${lastSavedAt}` : 'Autosaving enabled'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsDesignOpen(true)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            Design & Style
          </button>

          <button
            type="button"
            onClick={handleAiJump}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white/90 dark:text-gray-900"
          >
            AI Improve
          </button>

          <PrintExportButton
            onExport={onExport}
            isExporting={isExporting}
            downloadUrl={exportUrl}
            onCopyLink={onCopyExportLink}
            draftId={liveDraft.id}
          />

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

      {validationErrors.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">
          <p className="font-semibold">Please address:</p>
          <ul className="list-disc pl-5">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-4 flex gap-2 lg:hidden print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            activeTab === 'edit' ? 'bg-primary text-white' : 'bg-white text-gray-700'
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            activeTab === 'preview' ? 'bg-primary text-white' : 'bg-white text-gray-700'
          }`}
        >
          Preview
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(320px,420px)_1fr] min-h-0">
        <div className={`${activeTab === 'preview' ? 'hidden' : 'block'} space-y-6 lg:block print:hidden`}>
          <CvForm />

          <SectionManager
            sectionOrder={liveDraft.sectionOrder}
            sectionVisibility={liveDraft.sectionVisibility}
            onChange={handleSectionChange}
          />

          <div id="ai-panel">
            <AiAssistPanel draft={liveDraft} setValue={setValue} />
          </div>
        </div>

        <div className={`${activeTab === 'edit' ? 'hidden' : 'block'} lg:block min-h-0`}>
          <div className="sticky top-6 h-[calc(100vh-3rem)] min-h-0">
            <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 print:border-none print:bg-transparent print:p-0">
              <TemplateErrorBoundary>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <CvPreview draft={liveDraft} showLiveBadge resumeSourceHint={resumeSource} />
                </div>
              </TemplateErrorBoundary>
            </div>
          </div>
        </div>
      </div>

      {isDesignOpen && (
        <div className="fixed inset-0 z-[80] print:hidden" role="dialog" aria-modal="true" aria-label="Design & Style">
          <button
            type="button"
            aria-label="Close design panel"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setIsDesignOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-xl">
            <div className="ml-auto h-full w-full border-l border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-950">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Design & Style</h3>
                <button
                  type="button"
                  onClick={() => setIsDesignOpen(false)}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-white/10 dark:text-white"
                >
                  Close
                </button>
              </div>
              <div className="h-[calc(100%-56px)] overflow-y-auto p-4">
                <DesignFormattingPanel />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CvEditorShell;
