import React from 'react';

import { demoResume } from '../../templates/demoResume';
import { normalizeDraft } from '../../utils/cvDefaults';
import { templateRegistryById } from '../../templates/registry';
import type { AnyTemplate } from './types';

export function pickTemplatesById(templates: AnyTemplate[], ids: string[]): AnyTemplate[] {
  const byId = new Map(templates.map((template) => [template.id, template]));
  const picked = ids.map((id) => byId.get(id)).filter(Boolean) as AnyTemplate[];
  const need = Math.max(0, ids.length - picked.length);
  if (need <= 0) return picked.slice(0, ids.length);
  const fallback = templates.filter((template) => !picked.includes(template)).slice(0, need);
  return [...picked, ...fallback].slice(0, ids.length);
}

export function useThumbHtml(templateId?: string) {
  return React.useMemo(() => {
    if (!templateId) return null;
    const demoDraft = normalizeDraft({ ...demoResume, templateId });
    return templateRegistryById[templateId]?.renderHtml?.(demoDraft) ?? null;
  }, [templateId]);
}

export function getLandingCopy(variant: 'home' | 'templates') {
  if (variant === 'templates') {
    return {
      title: 'Choose the best resume template for your next role',
      subtitle:
        'Compare ATS-friendly layouts, preview each design instantly, and launch your new resume in minutes.',
    };
  }

  return {
    title: 'Create a job-winning resume in minutes!',
    subtitle:
      'Create an ATS-friendly, professional resume with our AI-powered builder — trusted by recruiters.',
  };
}
