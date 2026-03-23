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
  const { generateSummary, rewriteBullet, suggestSkills } = useAiCvAssist({
    backendUrl,
    token,
  }) as any;
  const [selectedBullet, setSelectedBullet] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);

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
