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

const STEPS = [
  'Personal details',
  'Contact info',
  'Work experience',
  'Skills',
  'Education',
  'Professional summary',
] as const;

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

  const liveDraft = useWatch({ control }) as CvDraft | undefined;
  const previewDraft = useMemo(() => normalizeDraft((liveDraft ?? draft) as CvDraft), [liveDraft, draft]);

  const liveTitle = previewDraft.title || '';
  const liveTemplateId = previewDraft.templateId || draft.templateId;
  const templateMeta: any =
    templateRegistryById[liveTemplateId] || templateRegistryList.find((t: any) => t.id === liveTemplateId);

  const templateDisplayName =
    (templateMeta?.name as string) ||
    (templateMeta?.label as string) ||
    (templateMeta?.title as string) ||
    (templateMeta?.displayName as string) ||
    liveTemplateId;

  useEffect(() => {
    if (!isDesignOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDesignOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [isDesignOpen]);

  useEffect(() => {
    if (liveTitle.trim() || !templateDisplayName) return;
    setValue('title', templateDisplayName, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
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

  const { resumeSource } = resolvePreviewDraft(previewDraft);

  return (
    <div className="min-h-screen bg-[#f3f5f8] px-4 pb-10 pt-6 dark:bg-[#0a0f1b] lg:px-8">
      <div className="mx-auto w-full max-w-screen-2xl">
        <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">Your resume</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/60">
              {lastSavedAt ? `Last saved ${lastSavedAt}` : 'Autosaving enabled'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setIsDesignOpen(true)} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white">Design & Style</button>
            <button type="button" onClick={handleAiJump} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white/90 dark:text-gray-900">AI Improve</button>
            <PrintExportButton onExport={onExport} isExporting={isExporting} downloadUrl={exportUrl} onCopyLink={onCopyExportLink} draftId={previewDraft.id} />
            <button type="button" onClick={onSave} disabled={isSaving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 print:hidden">
            <p className="font-semibold">Please address:</p>
            <ul className="list-disc pl-5">{validationErrors.map((error) => <li key={error}>{error}</li>)}</ul>
          </div>
        )}

        <div className="mb-4 flex gap-2 lg:hidden print:hidden">
          <button type="button" onClick={() => setActiveTab('edit')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === 'edit' ? 'bg-primary text-white' : 'bg-white text-gray-700'}`}>Edit</button>
          <button type="button" onClick={() => setActiveTab('preview')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === 'preview' ? 'bg-primary text-white' : 'bg-white text-gray-700'}`}>Preview</button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[250px_minmax(380px,520px)_1fr]">
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
              {STEPS.map((step, idx) => (
                <div key={step} className={`mb-1 rounded-xl px-3 py-2 text-sm ${idx === 0 ? 'bg-primary/10 font-semibold text-primary' : 'text-gray-600 dark:text-white/70'}`}>
                  <span className="mr-2 text-xs">{idx + 1}</span>{step}
                </div>
              ))}
              <button type="button" className="mt-2 w-full rounded-xl border border-dashed border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-600 dark:border-white/20 dark:text-white/70">Add section</button>
            </div>
          </aside>

          <div className={`${activeTab === 'preview' ? 'hidden' : 'block'} space-y-6 lg:block print:hidden`}>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <CvForm />
            </div>
            <SectionManager sectionOrder={previewDraft.sectionOrder} sectionVisibility={previewDraft.sectionVisibility} onChange={handleSectionChange} />
            <div id="ai-panel"><AiAssistPanel draft={previewDraft} setValue={setValue} /></div>
          </div>

          <div className={`${activeTab === 'edit' ? 'hidden' : 'block'} lg:block min-h-0`}>
            <div className="sticky top-6 h-[calc(100vh-3rem)] min-h-0">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 print:border-none print:bg-transparent print:p-0">
                <TemplateErrorBoundary>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <CvPreview draft={previewDraft} showLiveBadge resumeSourceHint={resumeSource} />
                  </div>
                </TemplateErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDesignOpen && (
        <div className="fixed inset-0 z-[80] print:hidden" role="dialog" aria-modal="true" aria-label="Design & Style">
          <button type="button" aria-label="Close design panel" className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setIsDesignOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-xl">
            <div className="ml-auto h-full w-full border-l border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-gray-950">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/10">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Design & Style</h3>
                <button type="button" onClick={() => setIsDesignOpen(false)} className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-white/10 dark:text-white">Close</button>
              </div>
              <div className="h-[calc(100%-56px)] overflow-y-auto p-4"><DesignFormattingPanel /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CvEditorShell;
