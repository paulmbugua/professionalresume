import React from 'react';
import { renderersById } from '@cvpro/shared/cover-letter/renderers/index.js';
import type { CoverLetterDraft, CoverLetterTemplateId } from '@cvpro/shared/types';

import ClassicLetter from '../components/cover-letter/templates/ClassicLetter';
import ProfessionalBlueLetterhead from '../components/cover-letter/templates/ProfessionalBlueLetterhead';
import CleanModernHeader from '../components/cover-letter/templates/CleanModernHeader';
import DarkHeaderCorporate from '../components/cover-letter/templates/DarkHeaderCorporate';
import MinimalWideNameHeader from '../components/cover-letter/templates/MinimalWideNameHeader';
import PlainReSubject from '../components/cover-letter/templates/PlainReSubject';
import SimpleEverydayFormal from '../components/cover-letter/templates/SimpleEverydayFormal';
import PremiumElegantBusiness from '../components/cover-letter/templates/PremiumElegantBusiness';

export type CoverLetterTemplateCategory =
  | 'Professional'
  | 'Modern'
  | 'Formal'
  | 'Executive'
  | 'Classic';

export type CoverLetterTemplateMeta = {
  id: CoverLetterTemplateId;
  name: string;
  category: CoverLetterTemplateCategory;
  description: string;
  tags: string[];
  component: React.FC<{ draft: CoverLetterDraft }>;
  renderHtml: (draft: CoverLetterDraft) => string;
};

export const coverLetterTemplateRegistry: CoverLetterTemplateMeta[] = [
  {
    id: 'classic-letter',
    name: 'Classic Letter',
    category: 'Classic',
    description: 'Traditional business-letter structure with balanced spacing and timeless typography.',
    tags: ['classic', 'traditional', 'business-letter'],
    component: ClassicLetter as React.FC<{ draft: CoverLetterDraft }>,
    renderHtml: renderersById['classic-letter'] as (draft: CoverLetterDraft) => string,
  },
  {
    id: 'professional-blue-letterhead',
    name: 'Professional Blue Letterhead',
    category: 'Professional',
    description: 'Classic letterhead with a blue top rule and polished hierarchy.',
    tags: ['professional', 'letterhead', 'clean'],
    component: ProfessionalBlueLetterhead as React.FC<{ draft: CoverLetterDraft }>,
    renderHtml: renderersById['professional-blue-letterhead'] as (draft: CoverLetterDraft) => string,
  },
  {
    id: 'clean-modern-header',
    name: 'Clean Modern Header',
    category: 'Modern',
    description: 'Minimal modern header with right-aligned contact details.',
    tags: ['modern', 'clean', 'minimal'],
    component: CleanModernHeader as React.FC<{ draft: CoverLetterDraft }>,
    renderHtml: renderersById['clean-modern-header'] as (draft: CoverLetterDraft) => string,
  },
  {
    id: 'dark-header-corporate',
    name: 'Dark Header Corporate',
    category: 'Executive',
    description: 'Corporate presentation with a bold dark top band and confident visual weight.',
    tags: ['corporate', 'executive', 'header'],
    component: DarkHeaderCorporate as React.FC<{ draft: CoverLetterDraft }>,
    renderHtml: renderersById['dark-header-corporate'] as (draft: CoverLetterDraft) => string,
  },
  {
    id: 'minimal-wide-name-header',
    name: 'Minimal Wide Name Header',
    category: 'Modern',
    description: 'Wide uppercase name treatment for a premium minimal visual identity.',
    tags: ['minimal', 'name-forward', 'modern'],
    component: MinimalWideNameHeader as React.FC<{ draft: CoverLetterDraft }>,
    renderHtml: renderersById['minimal-wide-name-header'] as (draft: CoverLetterDraft) => string,
  },
  {
    id: 'plain-re-subject',
    name: 'Plain Re Subject',
    category: 'Formal',
    description: 'Straightforward formal style emphasizing subject-line clarity.',
    tags: ['plain', 'subject', 'formal'],
    component: PlainReSubject as React.FC<{ draft: CoverLetterDraft }>,
    renderHtml: renderersById['plain-re-subject'] as (draft: CoverLetterDraft) => string,
  },
  {
    id: 'premium-elegant-business',
    name: 'Premium Elegant Business',
    category: 'Executive',
    description: 'Elegant serif style with subtle premium accent rules.',
    tags: ['premium', 'elegant', 'serif'],
    component: PremiumElegantBusiness as React.FC<{ draft: CoverLetterDraft }>,
    renderHtml: renderersById['premium-elegant-business'] as (draft: CoverLetterDraft) => string,
  },
  {
    id: 'simple-everyday-formal',
    name: 'Simple Everyday Formal',
    category: 'Formal',
    description: 'Familiar business-letter feel with approachable readability.',
    tags: ['simple', 'formal', 'readable'],
    component: SimpleEverydayFormal as React.FC<{ draft: CoverLetterDraft }>,
    renderHtml: renderersById['simple-everyday-formal'] as (draft: CoverLetterDraft) => string,
  },
];

export const coverLetterTemplateRegistryById = coverLetterTemplateRegistry.reduce(
  (acc, template) => {
    acc[template.id] = template;
    return acc;
  },
  {} as Record<string, CoverLetterTemplateMeta>
);

export const getCoverLetterTemplateById = (templateId: string): CoverLetterTemplateMeta | undefined =>
  coverLetterTemplateRegistryById[templateId];

export const getAllCoverLetterTemplates = (): CoverLetterTemplateMeta[] =>
  coverLetterTemplateRegistry;
