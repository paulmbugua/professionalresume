import type { CvSectionKey } from '@mytutorapp/shared/types';
import { demoResume } from '../../../../templates/demoResume';
import { templateRegistryList } from '../../../../templates/registry';

export const demoDraft = demoResume;

export const demoSectionOrder: CvSectionKey[] = demoResume.sectionOrder || [
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'extras',
];

export const demoSectionVisibility: Record<CvSectionKey, boolean> = {
  summary: true,
  skills: true,
  experience: true,
  education: true,
  projects: true,
  certifications: true,
  extras: true,
};

export const demoTemplate = templateRegistryList[0];
export const demoTemplates = templateRegistryList;
