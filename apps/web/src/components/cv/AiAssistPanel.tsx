import React, { useMemo, useState } from 'react';
import type { CvDraft } from '@cvpro/shared/types';
import { useAiCvAssist } from '@cvpro/shared/hooks';
import { useShopContext } from '@cvpro/shared/context';
import type { Path } from 'react-hook-form';

type Props = {
  draft: CvDraft;
  setValue: (name: Path<CvDraft>, value: any, options?: { shouldDirty?: boolean }) => void;
};

const AiAssistPanel: React.FC<Props> = ({ draft, setValue }) => {
  const { backendUrl, token } = useShopContext() as any;
  const { generateSummary, rewriteBullet, suggestSkills, jobRequirementAssist } = useAiCvAssist({
    backendUrl,
    token,
  }) as any;
  const [selectedBullet, setSelectedBullet] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);
  const [jobAdvertText, setJobAdvertText] = useState('');
  const [jobAssistStatus, setJobAssistStatus] = useState<string | null>(null);
  const [jobAssistResult, setJobAssistResult] = useState<any | null>(null);

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

  const cleanList = (items: string[] = []) =>
    Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)));

  const applyJobAssistSuggestions = () => {
    if (!jobAssistResult) return;

    const headlineSuggestion =
      jobAssistResult.tailoredHeadline || jobAssistResult.targetRoleTitle || '';
    const existingHeadline = String(draft.basics?.headline || '').trim();
    if (!existingHeadline || existingHeadline.length < 8) {
      setValue('basics.headline', headlineSuggestion, { shouldDirty: true });
    } else if (headlineSuggestion && !existingHeadline.includes(headlineSuggestion)) {
      setValue('basics.headline', headlineSuggestion, { shouldDirty: true });
    }

    if (jobAssistResult.tailoredSummary) {
      const existingSummary = String(draft.summary || '').trim();
      if (!existingSummary || existingSummary.length < 60) {
        setValue('summary', jobAssistResult.tailoredSummary, { shouldDirty: true });
      }
    }

    const mergedSkills = cleanList([
      ...(draft.skills || []),
      ...(jobAssistResult.keySkills || []),
      ...(jobAssistResult.toolsAndTechnologies || []),
    ]).slice(0, 24);
    setValue('skills', mergedSkills, { shouldDirty: true });

    const currentExperience = Array.isArray(draft.experience) ? [...draft.experience] : [];
    if (currentExperience.length > 0) {
      const tailoredSuggestions = Array.isArray(jobAssistResult.tailoredExperienceSuggestions)
        ? jobAssistResult.tailoredExperienceSuggestions
        : [];
      const genericBullets = cleanList([
        ...(jobAssistResult.coreResponsibilities || []),
        ...(jobAssistResult.preferredAchievements || []),
      ]);

      const nextExperience = currentExperience.map((entry, idx) => {
        const suggestion = tailoredSuggestions[idx] || tailoredSuggestions[0];
        const mergedBullets = cleanList([
          ...(entry?.bullets || []),
          ...((suggestion?.bullets as string[]) || []),
          ...genericBullets.slice(0, 2),
        ]).slice(0, 8);

        const existingDescription = String(entry?.description || '').trim();
        const nextDescription =
          existingDescription ||
          suggestion?.focusArea ||
          jobAssistResult.coreResponsibilities?.[0] ||
          '';

        return {
          ...entry,
          description: nextDescription,
          bullets: mergedBullets,
        };
      });

      setValue('experience', nextExperience as any, { shouldDirty: true });
    }

    if ((jobAssistResult.qualifications || []).length) {
      const existingCerts = Array.isArray(draft.certifications) ? draft.certifications : [];
      const existingNames = new Set(
        existingCerts.map((cert) => String(cert?.name || '').toLowerCase()).filter(Boolean)
      );
      const generatedCerts = (jobAssistResult.qualifications || [])
        .filter((name: string) => !existingNames.has(String(name).toLowerCase()))
        .slice(0, 4)
        .map((name: string) => ({
          name,
          issuer: '',
          year: '',
        }));
      if (generatedCerts.length) {
        setValue('certifications', [...existingCerts, ...generatedCerts], { shouldDirty: true });
      }
    }

    setJobAssistStatus(
      `Applied job-targeted suggestions${jobAssistResult.targetYearsExperience ? ` (target: ${jobAssistResult.targetYearsExperience})` : ''}.`
    );
  };

  const runJobRequirementAssist = async (regenerate = false) => {
    setJobAssistStatus(null);
    if (!jobAdvertText.trim() || jobAdvertText.trim().length < 40) {
      setJobAssistStatus('Please paste a fuller job advert (at least 40 characters).');
      return;
    }
    try {
      const res = await jobRequirementAssist.mutateAsync({
        draft,
        jobAdvertText,
        regenerate,
      });
      setJobAssistResult(res || null);
      setJobAssistStatus(
        regenerate
          ? 'Regenerated alternatives. Review and apply when ready.'
          : 'Job requirements analyzed. Review then apply suggestions.'
      );
    } catch (err: any) {
      setJobAssistStatus(err?.message || 'Failed to analyze job requirements');
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI Assist</h3>
        <span className="text-xs text-gray-400">
          {token ? 'CV suggestions' : 'Guest AI enabled ✨'}
        </span>
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

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/10">
          <p className="font-medium text-gray-900 dark:text-white">Tailor to Job Requirement</p>
          <p className="text-xs text-gray-500 dark:text-white/60">
            Paste a job advert and get structured role targets you can apply to your CV.
          </p>
          <textarea
            value={jobAdvertText}
            onChange={(e) => setJobAdvertText(e.target.value)}
            placeholder="Paste job requirements or a full advert here..."
            className="mt-2 min-h-[140px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 dark:border-white/10 dark:bg-darkCard dark:text-white"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runJobRequirementAssist(false)}
              disabled={jobRequirementAssist.isPending}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {jobRequirementAssist.isPending ? 'Analyzing...' : 'Analyze with AI'}
            </button>
            {jobAssistResult ? (
              <button
                type="button"
                onClick={() => runJobRequirementAssist(true)}
                disabled={jobRequirementAssist.isPending}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-60 dark:border-white/10 dark:bg-darkCard dark:text-white"
              >
                Regenerate with AI
              </button>
            ) : null}
            {jobAssistResult ? (
              <button
                type="button"
                onClick={applyJobAssistSuggestions}
                className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white/90 dark:text-gray-900"
              >
                Apply suggestions
              </button>
            ) : null}
          </div>

          {jobAssistResult ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900 dark:border-emerald-300/30 dark:bg-emerald-500/20 dark:text-emerald-100">
              <p>
                <b>Target role:</b> {jobAssistResult.targetRoleTitle || '—'} · <b>Experience:</b>{' '}
                {jobAssistResult.targetYearsExperience || '—'}
              </p>
              <p className="mt-1">
                <b>Suggested headline:</b> {jobAssistResult.tailoredHeadline || '—'}
              </p>
              <p className="mt-1">
                <b>Skills:</b> {(jobAssistResult.keySkills || []).slice(0, 8).join(', ') || '—'}
              </p>
              <p className="mt-1">
                <b>Tools:</b>{' '}
                {(jobAssistResult.toolsAndTechnologies || []).slice(0, 8).join(', ') || '—'}
              </p>
              {(jobAssistResult.coreResponsibilities || []).length ? (
                <ul className="mt-1 list-disc pl-5">
                  {(jobAssistResult.coreResponsibilities || []).slice(0, 3).map((item: string) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        {status && (
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100">
            {status}
          </div>
        )}
        {jobAssistStatus && (
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-500/20 dark:text-blue-100">
            {jobAssistStatus}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAssistPanel;
