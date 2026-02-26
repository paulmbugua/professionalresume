import type { CvDraft } from '@cvpro/shared/types';
import { demoResume } from './demoResume';

const manyBullets = Array.from(
  { length: 6 },
  (_, idx) =>
    `Delivered initiative ${idx + 1} with measurable KPI lift across product, analytics, and operations.`
);

export function buildPaginationStressDraft(templateId: string): CvDraft {
  return {
    ...demoResume,
    id: `stress-${templateId}`,
    templateId,
    title: `Pagination Stress (${templateId})`,
    experience: Array.from({ length: 8 }, (_, i) => ({
      company: `Longform Company ${i + 1}`,
      role: 'Senior Product Manager',
      start: `${2014 + i}`,
      end: `${2015 + i}`,
      location: 'Remote',
      bullets: manyBullets,
    })),
    projects: Array.from({ length: 6 }, (_, i) => ({
      name: `Large Project ${i + 1}`,
      link: `https://example.com/projects/${i + 1}`,
      description:
        'Detailed project narrative intended to force multi-page flow and list wrapping in export and print.',
      bullets: manyBullets,
    })),
  };
}

export function buildSidebarPaginationStressDraft(templateId: string): CvDraft {
  return {
    ...buildPaginationStressDraft(templateId),
    id: `stress-sidebar-${templateId}`,
    title: `Sidebar Pagination Stress (${templateId})`,
    summary: 'Product leader focused on pragmatic execution and measurable outcomes.',
    skills: ['Roadmapping', 'Stakeholder Management', 'Experimentation'],
    certifications: [],
    extras: [],
    experience: Array.from({ length: 7 }, (_, i) => ({
      company: `Main Column Heavy Org ${i + 1}`,
      role: 'Head of Product',
      start: `${2013 + i}`,
      end: `${2014 + i}`,
      location: 'Hybrid',
      bullets: manyBullets,
    })),
  };
}
