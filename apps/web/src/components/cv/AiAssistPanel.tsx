import React, { useMemo, useState } from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import { useAiCvAssist } from '@cvpro/shared/hooks';
import { useShopContext } from '@cvpro/shared/context';
import type { Path } from 'react-hook-form';

type Props = {
  draft: CvDraft;
  setValue: (name: Path<CvDraft>, value: any, options?: { shouldDirty?: boolean }) => void;
};

type CoverLetterSuggestion = {
  subject: string;
  greeting: string;
  body: string;
  closing: string;
};

const FALLBACK_MESSAGE =
  'AI suggestion failed. Your draft is untouched. Try again, simplify your prompt, or edit manually.';

const AiAssistPanel: React.FC<Props> = ({ draft, setValue }) => {
  const { backendUrl, token } = useShopContext() as any;
  const {
    generateSummary,
    rewriteBullet,
    suggestSkills,
    generateCoverLetter,
    rewriteCoverLetterStyle,
    improveCoverLetterParagraph,
    suggestCoverLetterSubjectLines,
    suggestCoverLetterGreetingClosing,
  } = useAiCvAssist({
    backendUrl,
    token,
  }) as any;
  const [selectedBullet, setSelectedBullet] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);

  const [coverForm, setCoverForm] = useState({
    jobTitle: '',
    company: '',
    experience: '',
    tone: 'professional',
    seniority: 'mid-level',
    style: 'professional' as 'professional' | 'concise' | 'confident' | 'ats-friendly',
    paragraph: '',
  });

  const [coverPreview, setCoverPreview] = useState<CoverLetterSuggestion | null>(null);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);
  const [greetingSuggestions, setGreetingSuggestions] = useState<string[]>([]);
  const [closingSuggestions, setClosingSuggestions] = useState<string[]>([]);

  const bulletTargets = useMemo(() => {
    const targets: Array<{
      key: string;
      label: string;
      path: Path<CvDraft>;
      context: string;
      bullet: string;
    }> = [];

    draft.experience?.forEach((exp, expIndex) => {
      exp.bullets?.forEach((bullet, bulletIndex) => {
        targets.push({
          key: `exp-${expIndex}-${bulletIndex}`,
          label: `Experience: ${exp.company || 'Company'} — ${bullet.slice(0, 40)}`,
          path: `experience.${expIndex}.bullets.${bulletIndex}` as Path<CvDraft>,
          context: `${exp.role || ''} at ${exp.company || ''}`.trim(),
          bullet,
        });
      });
    });

    draft.projects?.forEach((project, projectIndex) => {
      project.bullets?.forEach((bullet, bulletIndex) => {
        targets.push({
          key: `proj-${projectIndex}-${bulletIndex}`,
          label: `Project: ${project.name || 'Project'} — ${bullet.slice(0, 40)}`,
          path: `projects.${projectIndex}.bullets.${bulletIndex}` as Path<CvDraft>,
          context: project.description || project.name || 'Project experience',
          bullet,
        });
      });
    });

    return targets;
  }, [draft]);

  const handleSummary = async () => {
    setStatus(null);
    try {
      const res = await generateSummary.mutateAsync({ draft });
      if (res?.suggestion) {
        setValue('summary', res.suggestion, { shouldDirty: true });
        setStatus('Summary applied.');
      }
    } catch (err: any) {
      setStatus(err?.message || 'Failed to generate summary');
    }
  };

  const handleRewrite = async () => {
    setStatus(null);
    const target = bulletTargets.find((item) => item.key === selectedBullet);
    if (!target) {
      setStatus('Pick a bullet to rewrite.');
      return;
    }
    try {
      const res = await rewriteBullet.mutateAsync({
        context: target.context,
        bullet: target.bullet,
      });
      if (res?.suggestion) {
        setValue(target.path, res.suggestion, { shouldDirty: true });
        setStatus('Bullet updated.');
      }
    } catch (err: any) {
      setStatus(err?.message || 'Failed to rewrite bullet');
    }
  };

  const handleSuggestSkills = async () => {
    setStatus(null);
    try {
      const res = await suggestSkills.mutateAsync({ draft });
      const next = Array.from(new Set([...(draft.skills || []), ...(res?.suggestions || [])]));
      setValue('skills', next, { shouldDirty: true });
      setStatus('Skills added.');
    } catch (err: any) {
      setStatus(err?.message || 'Failed to suggest skills');
    }
  };

  const updateAiMeta = (action: string) => {
    setValue(
      'aiMeta',
      {
        ...(draft.aiMeta || {}),
        coverLetter: {
          ...((draft.aiMeta as any)?.coverLetter || {}),
          lastAction: action,
          lastModel: 'openai',
          lastUpdatedAt: new Date().toISOString(),
        },
      },
      { shouldDirty: true }
    );
  };

  const withFailureGuard = (fallback: string) => (err: any) => {
    console.error('cover-letter-ai-error', err);
    setStatus(err?.message || fallback || FALLBACK_MESSAGE);
  };

  const handleGenerateCoverLetter = async () => {
    setStatus(null);
    try {
      const res = await generateCoverLetter.mutateAsync(coverForm);
      if (res?.suggestion) {
        setCoverPreview(res.suggestion);
        updateAiMeta('generate-cover-letter');
        setStatus('Preview ready. Choose Replace, Insert, or Cancel.');
      }
    } catch (err) {
      withFailureGuard(FALLBACK_MESSAGE)(err);
    }
  };

  const handleRewriteStyle = async () => {
    setStatus(null);
    const body = draft.coverLetter?.body || '';
    if (!body.trim()) {
      setStatus('Add cover-letter body text first, then rewrite style.');
      return;
    }
    try {
      const res = await rewriteCoverLetterStyle.mutateAsync({ body, style: coverForm.style });
      if (res?.suggestion?.body) {
        setCoverPreview({
          subject: draft.coverLetter?.subject || '',
          greeting: draft.coverLetter?.greeting || '',
          body: res.suggestion.body,
          closing: draft.coverLetter?.closing || '',
        });
        updateAiMeta('rewrite-cover-letter-style');
        setStatus('Style rewrite preview ready. Choose Replace, Insert, or Cancel.');
      }
    } catch (err) {
      withFailureGuard(FALLBACK_MESSAGE)(err);
    }
  };

  const handleImproveParagraph = async () => {
    setStatus(null);
    if (!coverForm.paragraph.trim()) {
      setStatus('Paste a paragraph to improve.');
      return;
    }
    try {
      const res = await improveCoverLetterParagraph.mutateAsync({
        paragraph: coverForm.paragraph,
        context: draft.coverLetter?.body || '',
      });
      if (res?.suggestion?.paragraph) {
        setCoverPreview({
          subject: draft.coverLetter?.subject || '',
          greeting: draft.coverLetter?.greeting || '',
          body: res.suggestion.paragraph,
          closing: draft.coverLetter?.closing || '',
        });
        updateAiMeta('improve-cover-letter-paragraph');
        setStatus('Paragraph preview ready. Choose Replace, Insert, or Cancel.');
      }
    } catch (err) {
      withFailureGuard(FALLBACK_MESSAGE)(err);
    }
  };

  const handleSubjectSuggestions = async () => {
    setStatus(null);
    try {
      const res = await suggestCoverLetterSubjectLines.mutateAsync({
        body: draft.coverLetter?.body || '',
        jobTitle: coverForm.jobTitle,
        company: coverForm.company,
      });
      setSubjectSuggestions(res?.suggestions || []);
      updateAiMeta('suggest-cover-letter-subject');
      setStatus('Subject line suggestions ready.');
    } catch (err) {
      withFailureGuard(FALLBACK_MESSAGE)(err);
    }
  };

  const handleGreetingClosingSuggestions = async () => {
    setStatus(null);
    try {
      const res = await suggestCoverLetterGreetingClosing.mutateAsync({
        body: draft.coverLetter?.body || '',
        jobTitle: coverForm.jobTitle,
        company: coverForm.company,
      });
      setGreetingSuggestions(res?.suggestions?.greetings || []);
      setClosingSuggestions(res?.suggestions?.closings || []);
      updateAiMeta('suggest-cover-letter-greeting-closing');
      setStatus('Greeting/closing suggestions ready.');
    } catch (err) {
      withFailureGuard(FALLBACK_MESSAGE)(err);
    }
  };

  const applyPreviewReplace = () => {
    if (!coverPreview) return;
    setValue('coverLetter', coverPreview, { shouldDirty: true });
    setCoverPreview(null);
    setStatus('Cover letter replaced from preview.');
  };

  const applyPreviewInsert = () => {
    if (!coverPreview) return;
    const currentBody = draft.coverLetter?.body || '';
    const nextBody = [currentBody, coverPreview.body].filter(Boolean).join('\n\n');
    setValue(
      'coverLetter',
      {
        subject: draft.coverLetter?.subject || coverPreview.subject,
        greeting: draft.coverLetter?.greeting || coverPreview.greeting,
        body: nextBody,
        closing: draft.coverLetter?.closing || coverPreview.closing,
      },
      { shouldDirty: true }
    );
    setCoverPreview(null);
    setStatus('Preview inserted into your cover-letter body.');
  };

  const cancelPreview = () => {
    setCoverPreview(null);
    setStatus('Preview canceled. Draft content unchanged.');
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Assist</h3>
        <span className="text-xs text-gray-400">Smart suggestions</span>
      </div>

      <div className="space-y-4 text-sm text-gray-700 dark:text-white/80">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/10">
          <p className="font-medium text-gray-900 dark:text-white">Professional Summary</p>
          <p className="text-xs text-gray-500 dark:text-white/60">
            Generate a concise summary based on your draft.
          </p>
          <button
            type="button"
            onClick={handleSummary}
            disabled={generateSummary.isPending}
            className="mt-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {generateSummary.isPending ? 'Generating...' : 'Generate Summary'}
          </button>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/10">
          <p className="font-medium text-gray-900 dark:text-white">Rewrite Bullet</p>
          <p className="text-xs text-gray-500 dark:text-white/60">Improve impact and clarity.</p>
          <select
            value={selectedBullet}
            onChange={(e) => setSelectedBullet(e.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-white/10 dark:bg-darkCard dark:text-white"
          >
            <option value="">Select a bullet</option>
            {bulletTargets.map((target) => (
              <option key={target.key} value={target.key}>
                {target.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleRewrite}
            disabled={rewriteBullet.isPending}
            className="mt-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 dark:bg-white/90 dark:text-gray-900"
          >
            {rewriteBullet.isPending ? 'Rewriting...' : 'Rewrite Bullet'}
          </button>
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/10">
          <p className="font-medium text-gray-900 dark:text-white">Suggest Skills</p>
          <p className="text-xs text-gray-500 dark:text-white/60">
            Get skill recommendations based on your content.
          </p>
          <button
            type="button"
            onClick={handleSuggestSkills}
            disabled={suggestSkills.isPending}
            className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60 dark:border-white/10 dark:bg-darkCard dark:text-white"
          >
            {suggestSkills.isPending ? 'Thinking...' : 'Suggest Skills'}
          </button>
        </div>

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-300/20 dark:bg-indigo-500/10">
          <p className="font-medium text-gray-900 dark:text-white">Cover Letter AI</p>
          <p className="text-xs text-gray-500 dark:text-white/60">
            Generate or refine your cover letter. Failed calls never overwrite your draft.
          </p>

          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input
              value={coverForm.jobTitle}
              onChange={(e) => setCoverForm((s) => ({ ...s, jobTitle: e.target.value }))}
              placeholder="Job title"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
            />
            <input
              value={coverForm.company}
              onChange={(e) => setCoverForm((s) => ({ ...s, company: e.target.value }))}
              placeholder="Company"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
            />
            <input
              value={coverForm.tone}
              onChange={(e) => setCoverForm((s) => ({ ...s, tone: e.target.value }))}
              placeholder="Tone (e.g., warm, direct)"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
            />
            <input
              value={coverForm.seniority}
              onChange={(e) => setCoverForm((s) => ({ ...s, seniority: e.target.value }))}
              placeholder="Seniority"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
            />
          </div>

          <textarea
            value={coverForm.experience}
            onChange={(e) => setCoverForm((s) => ({ ...s, experience: e.target.value }))}
            placeholder="Paste relevant experience for generation context"
            className="mt-2 min-h-20 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateCoverLetter}
              disabled={generateCoverLetter.isPending}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {generateCoverLetter.isPending ? 'Generating...' : 'Generate cover letter'}
            </button>

            <select
              value={coverForm.style}
              onChange={(e) => setCoverForm((s) => ({ ...s, style: e.target.value as any }))}
              className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"
            >
              <option value="professional">professional</option>
              <option value="concise">concise</option>
              <option value="confident">confident</option>
              <option value="ats-friendly">ATS-friendly</option>
            </select>
            <button
              type="button"
              onClick={handleRewriteStyle}
              disabled={rewriteCoverLetterStyle.isPending}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
            >
              {rewriteCoverLetterStyle.isPending ? 'Rewriting...' : 'Rewrite style'}
            </button>
          </div>

          <textarea
            value={coverForm.paragraph}
            onChange={(e) => setCoverForm((s) => ({ ...s, paragraph: e.target.value }))}
            placeholder="Paste one paragraph to improve"
            className="mt-2 min-h-16 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs"
          />
          <button
            type="button"
            onClick={handleImproveParagraph}
            disabled={improveCoverLetterParagraph.isPending}
            className="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
          >
            {improveCoverLetterParagraph.isPending ? 'Improving...' : 'Improve paragraph only'}
          </button>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSubjectSuggestions}
              disabled={suggestCoverLetterSubjectLines.isPending}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
            >
              {suggestCoverLetterSubjectLines.isPending ? 'Thinking...' : 'Suggest subject lines'}
            </button>
            <button
              type="button"
              onClick={handleGreetingClosingSuggestions}
              disabled={suggestCoverLetterGreetingClosing.isPending}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60"
            >
              {suggestCoverLetterGreetingClosing.isPending
                ? 'Thinking...'
                : 'Suggest greeting/closing'}
            </button>
          </div>

          {subjectSuggestions.length > 0 && (
            <div className="mt-2 rounded-lg bg-white/90 p-2 text-xs">
              <p className="font-semibold">Subject ideas</p>
              <ul className="mt-1 list-disc pl-4">
                {subjectSuggestions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {(greetingSuggestions.length > 0 || closingSuggestions.length > 0) && (
            <div className="mt-2 rounded-lg bg-white/90 p-2 text-xs">
              <p className="font-semibold">Greeting / Closing ideas</p>
              {greetingSuggestions.length > 0 && <p>Greetings: {greetingSuggestions.join(' · ')}</p>}
              {closingSuggestions.length > 0 && <p>Closings: {closingSuggestions.join(' · ')}</p>}
            </div>
          )}

          {coverPreview && (
            <div className="mt-2 rounded-lg border border-indigo-200 bg-white p-3 text-xs">
              <p className="font-semibold text-gray-900">AI preview</p>
              <p>
                <b>Subject:</b> {coverPreview.subject || '—'}
              </p>
              <p>
                <b>Greeting:</b> {coverPreview.greeting || '—'}
              </p>
              <p className="whitespace-pre-wrap">
                <b>Body:</b> {coverPreview.body || '—'}
              </p>
              <p>
                <b>Closing:</b> {coverPreview.closing || '—'}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyPreviewReplace}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={applyPreviewInsert}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-700"
                >
                  Insert
                </button>
                <button
                  type="button"
                  onClick={cancelPreview}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {status && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100">
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAssistPanel;
