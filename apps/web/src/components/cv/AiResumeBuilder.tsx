'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormContext, useWatch } from 'react-hook-form';
import { useShopContext } from '@cvpro/shared/context';
import type { CvDraft } from '@cvpro/shared/types';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  History,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  buildResume,
  resumeClient,
  resumeDataFromDraft,
  uploadOriginalResume,
  type ResumeFactReview,
  type ResumeVersion,
} from '../../utils/resumeGenerationApi';
import { templateRegistry as templateRegistryList } from '../../templates/registry';
import { normalizeDraft } from '../../utils/cvDefaults';
import TemplateThumbnail from './templates/TemplateThumbnail';

export default function AiResumeBuilder({
  onBuilt,
  onBusyChange,
  onBeforeBuild,
}: {
  onBuilt?: () => void;
  onBusyChange?: (busy: boolean) => void;
  onBeforeBuild?: () => Promise<void>;
}) {
  const { backendUrl, token } = useShopContext() as { backendUrl: string; token: string };
  const { getValues, reset, control, setValue } = useFormContext<CvDraft>();
  const draft = useWatch({ control }) as CvDraft;
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<{ originalDocumentId: string; filename: string } | null>(
    null
  );
  const [job, setJob] = useState('');
  const [tone, setTone] = useState('professional');
  const [stage, setStage] = useState<'idle' | 'upload' | 'build' | 'regenerate'>('idle');
  const [error, setError] = useState('');
  const [review, setReview] = useState<ResumeFactReview | null>(null);
  const [blockedClaims, setBlockedClaims] = useState<
    Array<{ statement: string; evidence: string }>
  >([]);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [section, setSection] = useState('summary');
  const [instruction, setInstruction] = useState(
    'Make this more concise and specific to the target role.'
  );
  const [showReview, setShowReview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = stage !== 'idle';
  const generated = Boolean(draft.generationMeta?.originalDocumentId);
  const template = templateRegistryList.find((entry) => entry.id === draft.templateId);

  useEffect(() => {
    if (draft.generationMeta?.originalDocumentId && !file)
      setSource({
        originalDocumentId: String(draft.generationMeta.originalDocumentId),
        filename: String(draft.generationMeta.filename || 'Original resume'),
      });
    if (draft.generationMeta?.targetJobDescription)
      setJob(String(draft.generationMeta.targetJobDescription));
    // Hydrate only when the source/version changes so typing never restores old text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft.id,
    draft.generationMeta?.originalDocumentId,
    draft.generationMeta?.generatedResumeVersionId,
  ]);

  const applyResult = (next: CvDraft) => {
    reset(normalizeDraft(next), { keepDefaultValues: true });
    if (getValues('id') === 'guest' || draft.id !== next.id) router.replace(`/builder/${next.id}`);
    onBuilt?.();
  };
  const run = async (regenerate = false) => {
    if (!token || busy) return;
    setError('');
    setBlockedClaims([]);
    onBusyChange?.(true);
    setStage(regenerate ? 'regenerate' : 'build');
    try {
      await onBeforeBuild?.();
      let original = source;
      if (file && !regenerate && !original) {
        setStage('upload');
        original = await uploadOriginalResume(backendUrl, token, file);
        setSource(original);
      }
      if (!original) throw new Error('Upload your original resume first.');
      const current = getValues();
      setStage(regenerate ? 'regenerate' : 'build');
      const result = await buildResume(backendUrl, token, {
        originalDocumentId: regenerate
          ? current.generationMeta?.originalDocumentId
          : original.originalDocumentId,
        targetJobDescription: job,
        selectedTemplate: current.templateId,
        generationPreferences: { tone },
        ...(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(current.id) ? { draftId: current.id } : {}),
        ...(regenerate
          ? { section, instruction, currentResume: resumeDataFromDraft(current) }
          : {}),
      });
      setReview(result.factReview);
      applyResult(result.draft);
      setFile(null);
      setHistoryOpen(false);
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || 'Could not build your resume. Please try again.'
      );
      setBlockedClaims(err.response?.data?.claims || []);
    } finally {
      setStage('idle');
      onBusyChange?.(false);
    }
  };
  const loadHistory = async () => {
    setError('');
    try {
      const response = await resumeClient(backendUrl, token).get<{ versions: ResumeVersion[] }>(
        `/api/cv/drafts/${draft.id}/generated-versions`
      );
      setVersions(response.data.versions);
      setHistoryOpen(true);
    } catch {
      setError('Could not load generation history. Please try again.');
    }
  };
  const downloadSource = async () => {
    try {
      const response = await resumeClient(backendUrl, token).get(
        `/api/cv/original-resumes/${source?.originalDocumentId}/file`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = source?.filename || 'original-resume';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Could not download your original resume.');
    }
  };

  return (
    <section
      id="resume-ai-builder"
      className="border-b border-gray-200 pb-6 dark:border-white/15"
      aria-busy={busy}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Resume Builder</h3>
        </div>
        {generated && (
          <button
            type="button"
            title="Generation history"
            aria-label="Generation history"
            onClick={loadHistory}
            disabled={busy}
            className="rounded-lg border p-2 dark:border-white/20"
          >
            <History className="h-5 w-5" />
          </button>
        )}
      </div>
      {!token ? (
        <Link
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300"
          href={`/login?returnTo=${encodeURIComponent('/builder/guest?aiStart=1')}`}
        >
          Sign in to build your resume <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
      <fieldset disabled={busy || !token} className="space-y-5 disabled:opacity-65">
        <div>
          <label htmlFor="resume-source" className="mb-2 block text-sm font-semibold">
            1. Original resume
          </label>
          <input
            ref={inputRef}
            id="resume-source"
            type="file"
            accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
            className="sr-only"
            onChange={(event) => {
              const selected = event.target.files?.[0] || null;
              setReview(null);
              if (selected && selected.size > 8 * 1024 * 1024) {
                setError('Upload a file smaller than 8 MB.');
                return;
              }
              setFile(selected);
              setSource(null);
              setError('');
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-20 w-full items-center gap-3 rounded-lg border border-dashed border-gray-400 bg-gray-50 px-4 py-3 text-left dark:border-gray-500 dark:bg-gray-900"
          >
            {file || source ? (
              <FileText className="h-6 w-6 shrink-0 text-emerald-600" />
            ) : (
              <Upload className="h-6 w-6 shrink-0 text-gray-500" />
            )}
            <span className="min-w-0">
              <span className="block break-all text-sm font-medium">
                {file?.name || source?.filename || 'Choose your resume'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                PDF, DOCX, TXT or scanned image · Up to 8 MB
              </span>
            </span>
          </button>
          {source && (
            <button
              type="button"
              onClick={downloadSource}
              className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-300"
            >
              Download original
            </button>
          )}
        </div>
        <div>
          <label htmlFor="resume-job" className="mb-2 block text-sm font-semibold">
            2. Target job description
          </label>
          <textarea
            id="resume-job"
            value={job}
            onChange={(event) => setJob(event.target.value)}
            maxLength={60000}
            rows={6}
            className="input w-full resize-y text-sm"
            placeholder="Paste the complete job description"
          />
          <div className="mt-1 text-right text-xs text-gray-500">
            {job.length.toLocaleString()} / 60,000
          </div>
        </div>
        <div>
          <label htmlFor="resume-design" className="mb-2 block text-sm font-semibold">
            3. Resume design
          </label>
          <div className="grid grid-cols-[124px_minmax(0,1fr)] gap-3">
            <div className="h-[172px] overflow-hidden rounded border border-gray-200 bg-white">
              {template?.renderHtml && (
                <TemplateThumbnail
                  html={template.renderHtml(normalizeDraft(draft))}
                  label={template.name}
                />
              )}
            </div>
            <div className="min-w-0 space-y-3">
              <select
                id="resume-design"
                value={draft.templateId}
                onChange={(event) => {
                  setValue('templateId', event.target.value, { shouldDirty: true });
                  setValue(
                    'templateTheme',
                    normalizeDraft({
                      ...getValues(),
                      templateId: event.target.value,
                      templateTheme: undefined,
                    }).templateTheme!,
                    { shouldDirty: true }
                  );
                }}
                className="input w-full min-w-0 text-sm"
              >
                {templateRegistryList.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <label htmlFor="resume-tone" className="block text-xs font-medium">
                Writing tone
              </label>
              <select
                id="resume-tone"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                className="input w-full text-sm"
              >
                <option value="professional">Professional</option>
                <option value="concise">Concise</option>
                <option value="confident">Confident</option>
              </select>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => run()}
          disabled={(!file && !source) || job.trim().length < 40 || busy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {stage === 'upload'
            ? 'Saving original resume...'
            : stage === 'build'
              ? 'Building and checking facts...'
              : 'Build My Resume'}
        </button>
      </fieldset>
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200"
        >
          {error}
          {blockedClaims.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {blockedClaims.map((claim, index) => (
                <li key={index}>{claim.statement}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {review && (
        <div className="mt-4 border-t border-gray-200 pt-3 dark:border-white/15">
          <button
            type="button"
            onClick={() => setShowReview(!showReview)}
            className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
          >
            <ShieldCheck className="h-5 w-5" />
            {review.claims.length} factual fields reviewed
          </button>
          {review.warnings.map((warning, index) => (
            <p key={index} className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              {warning}
            </p>
          ))}
          {showReview && (
            <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
              {review.claims.map((claim) => (
                <div
                  key={claim.path}
                  className="border-b border-gray-100 pb-2 text-xs dark:border-white/10"
                >
                  <p className="font-semibold">{claim.statement}</p>
                  <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                    {claim.classification === 'SUPPORTED' ? 'Supported' : 'Reasonable rephrase'}
                  </p>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">{claim.evidence}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {generated && (
        <div className="mt-5 space-y-3 border-t border-gray-200 pt-4 dark:border-white/15">
          <h4 className="text-sm font-semibold">Refine a section</h4>
          <select
            aria-label="Section to improve"
            value={section}
            onChange={(event) => setSection(event.target.value)}
            disabled={busy}
            className="input w-full text-sm"
          >
            {[
              'summary',
              'skills',
              'experience',
              'projects',
              'education',
              'certifications',
              'extras',
              'additionalSections',
              'targetTitle',
            ].map((key) => (
              <option key={key} value={key}>
                {key === 'additionalSections'
                  ? 'Additional sections'
                  : key === 'targetTitle'
                    ? 'Professional title'
                    : key.charAt(0).toUpperCase() + key.slice(1)}
              </option>
            ))}
          </select>
          <textarea
            aria-label="Section improvement request"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            maxLength={2000}
            rows={2}
            disabled={busy}
            className="input w-full text-sm"
          />
          <button
            type="button"
            disabled={busy || !instruction.trim() || !token || job.trim().length < 40}
            onClick={() => run(true)}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-white/20"
          >
            {stage === 'regenerate' ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {stage === 'regenerate' ? 'Refining and checking facts...' : 'Regenerate Section'}
          </button>
        </div>
      )}
      {historyOpen && (
        <div className="mt-4 border-t border-gray-200 pt-4 dark:border-white/15">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Generation history</h4>
            <button
              type="button"
              title="Close history"
              aria-label="Close history"
              onClick={() => setHistoryOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex items-center justify-between gap-2 border-b border-gray-100 py-3 text-xs dark:border-white/10"
            >
              <span>
                <span className="block font-medium">
                  {version.action === 'build'
                    ? 'Full resume'
                    : version.action.replace('regenerate:', 'Refined ')}
                </span>
                {new Date(version.createdAt).toLocaleString()}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const current = getValues();
                  reset(
                    normalizeDraft({
                      ...current,
                      ...version.resumeData,
                      richText: {},
                      generationMeta: {
                        ...current.generationMeta,
                        generatedResumeVersionId: version.id,
                        filename: version.filename || current.generationMeta?.filename,
                        originalDocumentId: version.originalDocumentId,
                        targetJobDescription: version.targetJobDescription,
                      },
                      meta: { ...current.meta, isDemoSeeded: false },
                    }),
                    { keepDefaultValues: true }
                  );
                  setReview(version.factReview);
                  setJob(version.targetJobDescription);
                  setSource(null);
                  setFile(null);
                  setHistoryOpen(false);
                }}
                className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-300"
              >
                <CheckCircle2 className="h-4 w-4" />
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
