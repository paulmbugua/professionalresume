import React from 'react';
import { renderersById } from '@cvpro/shared/cover-letter/renderers/index.js';

import ProfessionalBlueLetterhead from '../components/cover-letter/templates/ProfessionalBlueLetterhead';
import CleanModernHeader from '../components/cover-letter/templates/CleanModernHeader';
import DarkHeaderCorporate from '../components/cover-letter/templates/DarkHeaderCorporate';
import MinimalWideNameHeader from '../components/cover-letter/templates/MinimalWideNameHeader';
import PlainReSubject from '../components/cover-letter/templates/PlainReSubject';
import SimpleEverydayFormal from '../components/cover-letter/templates/SimpleEverydayFormal';
import PremiumElegantBusiness from '../components/cover-letter/templates/PremiumElegantBusiness';

export type CoverLetterTemplateMeta = {
  id: string;
  name: string;
  category: 'Professional' | 'Modern' | 'Formal' | 'Executive';
  description: string;
  tags: string[];
  component: React.FC<{ draft: Record<string, unknown> & { templateId?: string } }>;
  renderHtml: (draft: Record<string, unknown>) => string;
};

export const coverLetterTemplateRegistry: CoverLetterTemplateMeta[] = [
  {
    id: 'professional-blue-letterhead',
    name: 'Professional Blue Letterhead',
    category: 'Professional',
    description: 'Classic letterhead with blue top rule and polished hierarchy.',
    tags: ['professional', 'letterhead', 'clean'],
    component: ProfessionalBlueLetterhead,
    renderHtml: renderersById['professional-blue-letterhead'],
  },
  {
    id: 'clean-modern-header',
    name: 'Clean Modern Header',
    category: 'Modern',
    description: 'Minimal modern header with right-aligned contact metadata.',
    tags: ['modern', 'clean', 'minimal'],
    component: CleanModernHeader,
    renderHtml: renderersById['clean-modern-header'],
  },
  {
    id: 'dark-header-corporate',
    name: 'Dark Header Corporate',
    category: 'Executive',
    description: 'Corporate presentation with bold dark top band.',
    tags: ['corporate', 'executive', 'header'],
    component: DarkHeaderCorporate,
    renderHtml: renderersById['dark-header-corporate'],
  },
  {
    id: 'minimal-wide-name-header',
    name: 'Minimal Wide Name Header',
    category: 'Modern',
    description: 'Wide uppercase name treatment for a premium minimal look.',
    tags: ['minimal', 'name-forward', 'modern'],
    component: MinimalWideNameHeader,
    renderHtml: renderersById['minimal-wide-name-header'],
  },
  {
    id: 'plain-re-subject',
    name: 'Plain Re Subject',
    category: 'Formal',
    description: 'Straightforward formal style emphasizing subject line clarity.',
    tags: ['plain', 'subject', 'formal'],
    component: PlainReSubject,
    renderHtml: renderersById['plain-re-subject'],
  },
  {
    id: 'simple-everyday-formal',
    name: 'Simple Everyday Formal',
    category: 'Formal',
    description: 'Familiar business-letter feel with everyday readability.',
    tags: ['simple', 'formal', 'readable'],
    component: SimpleEverydayFormal,
    renderHtml: renderersById['simple-everyday-formal'],
  },
  {
    id: 'premium-elegant-business',
    name: 'Premium Elegant Business',
    category: 'Executive',
    description: 'Elegant serif style with subtle premium accent rules.',
    tags: ['premium', 'elegant', 'serif'],
    component: PremiumElegantBusiness,
    renderHtml: renderersById['premium-elegant-business'],
  },
];

export const coverLetterTemplateRegistryById = coverLetterTemplateRegistry.reduce(
  (acc, template) => {
    acc[template.id] = template;
    return acc;
  },
  {} as Record<string, CoverLetterTemplateMeta>
);
