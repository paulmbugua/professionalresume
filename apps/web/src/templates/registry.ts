import React from 'react';
import type { CvDraft, CvTemplate } from '@cvpro/shared/types';
import AtsMinimal from '../components/cv/templates/AtsMinimal';
import ModernSidebar from '../components/cv/templates/ModernSidebar';
import BoldHeader from '../components/cv/templates/BoldHeader';
import ElegantSerif from '../components/cv/templates/ElegantSerif';
import CreativeTimeline from '../components/cv/templates/CreativeTimeline';
import CompactOnePager from '../components/cv/templates/CompactOnePager';

export type TemplateMeta = CvTemplate & {
  description?: string;
  tags?: string[];
  component: React.FC<{ draft: CvDraft }>;
};

export const templateRegistry: TemplateMeta[] = [
  {
    id: 'ats-minimal',
    name: 'ATS Minimal',
    category: 'ATS',
    isAtsFriendly: true,
    componentKey: 'AtsMinimal',
    description: 'Simple, ATS-friendly layout with clean typography.',
    tags: ['ats', 'minimal'],
    component: AtsMinimal,
  },
  {
    id: 'modern-sidebar',
    name: 'Modern Sidebar',
    category: 'Modern',
    isAtsFriendly: false,
    componentKey: 'ModernSidebar',
    description: 'Two-column layout that highlights skills and summary.',
    tags: ['modern', 'sidebar'],
    component: ModernSidebar,
  },
  {
    id: 'bold-header',
    name: 'Bold Header',
    category: 'Modern',
    isAtsFriendly: true,
    componentKey: 'BoldHeader',
    description: 'Statement header with strong section hierarchy.',
    tags: ['modern', 'bold'],
    component: BoldHeader,
  },
  {
    id: 'elegant-serif',
    name: 'Elegant Serif',
    category: 'Classic',
    isAtsFriendly: true,
    componentKey: 'ElegantSerif',
    description: 'Classic serif styling for a timeless look.',
    tags: ['classic', 'serif'],
    component: ElegantSerif,
  },
  {
    id: 'creative-timeline',
    name: 'Creative Timeline',
    category: 'Creative',
    isAtsFriendly: false,
    componentKey: 'CreativeTimeline',
    description: 'Timeline layout that emphasizes career progression.',
    tags: ['creative', 'timeline'],
    component: CreativeTimeline,
  },
  {
    id: 'compact-one-pager',
    name: 'Compact One-Pager',
    category: 'Compact',
    isAtsFriendly: true,
    componentKey: 'CompactOnePager',
    description: 'Dense one-page layout for concise resumes.',
    tags: ['compact', 'ats'],
    component: CompactOnePager,
  },
];

export const templateRegistryList: CvTemplate[] = templateRegistry.map(
  ({ component, ...rest }) => rest
);

export const templateRegistryById = templateRegistry.reduce(
  (acc, template) => {
    acc[template.id] = template;
    return acc;
  },
  {} as Record<string, TemplateMeta>
);
