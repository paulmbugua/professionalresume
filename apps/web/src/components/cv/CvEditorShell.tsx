import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { CvDraft, CvSectionKey } from '@mytutorapp/shared/types';
import CvForm from './CvForm';
import CvPreview from './CvPreview';
import SectionManager from './SectionManager';
import AiAssistPanel from './AiAssistPanel';
import PrintExportButton from './PrintExportButton';
import TemplateErrorBoundary from './TemplateErrorBoundary';
import TemplateDebugPanel from './TemplateDebugPanel';
import { resolvePreviewDraft } from '../../templates/demoResume';
import { templateRegistry, templateRegistryById } from '../../templates/registry';

type Props = {
  draft: CvDraft;
  validationErrors: string[];
  onSave: () => void;
  isSaving: boolean;
  lastSavedAt?: string;
};

const CvEditorShell: React.FC<Props> = ({
  draft,
  validationErrors,
  onSave,
  isSaving,
  lastSavedAt,
}) => {
  const { setValue } = useFormContext<CvDraft>();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

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

  const { resumeSource } = resolvePreviewDraft(draft);
  const templateSource = templateRegistryById[draft.templateId] ? 'local' : 'unknown';

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-400">CV Builder</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {draft.title || 'Untitled CV'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-white/60">
            {lastSavedAt ? `Last saved ${lastSavedAt}` : 'Autosaving enabled'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAiJump}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white/90 dark:text-gray-900"
          >
            AI Improve
          </button>
          <PrintExportButton />
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

      <div className="grid gap-8 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <div className={`${activeTab === 'preview' ? 'hidden' : 'block'} space-y-6 lg:block print:hidden`}>
          <CvForm />
          <SectionManager
            sectionOrder={draft.sectionOrder}
            sectionVisibility={draft.sectionVisibility}
            onChange={handleSectionChange}
          />
          <div id="ai-panel">
            <AiAssistPanel draft={draft} setValue={setValue} />
          </div>
        </div>
        <div className={`${activeTab === 'edit' ? 'hidden' : 'block'} lg:block`}>
          <div className="rounded-2xl border border-gray-200 bg-white/60 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 print:border-none print:bg-transparent print:p-0">
            <TemplateErrorBoundary>
              <CvPreview draft={draft} />
            </TemplateErrorBoundary>
            <TemplateDebugPanel
              draft={draft}
              templateCount={templateRegistry.length}
              templateSource={templateSource}
              resumeSource={resumeSource}
              apiError={undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CvEditorShell;
