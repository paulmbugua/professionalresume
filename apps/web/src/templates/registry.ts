// apps/web/src/templates/registry.ts
import React from 'react';
import type { CvDraft, CvTemplate } from '@cvpro/shared/types';

import AtsMinimal, { renderAtsMinimalHtml } from '../components/cv/templates/AtsMinimal';
import ModernSidebar from '../components/cv/templates/ModernSidebar';
import BoldHeader, { renderBoldHeaderHtml } from '../components/cv/templates/BoldHeader';
import ElegantSerif from '../components/cv/templates/ElegantSerif';
import CreativeTimeline from '../components/cv/templates/CreativeTimeline';
import CompactOnePager from '../components/cv/templates/CompactOnePager';

import ModernTeal, { renderModernTealHtml } from '../components/cv/templates/ModernTeal';
import ModernSidebarBlue, {
  renderModernSidebarBlueHtml,
} from '../components/cv/templates/ModernSidebarBlue';

import AtsCompact, { renderAtsCompactHtml } from '../components/cv/templates/AtsCompact';

export type TemplateMeta = CvTemplate & {
  description?: string;
  tags?: string[];
  component: React.FC<{ draft: CvDraft }>;
  /**
   * Used for template thumbnails (iframe srcDoc). If missing, the card preview will be blank.
   * Must return a full HTML document with inline styles (Tailwind doesn't exist in srcDoc).
   */
  renderHtml?: (draft: CvDraft) => string;
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
    renderHtml: renderAtsMinimalHtml,
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
    // NOTE: no renderHtml → thumbnail will show "Preview unavailable"
    // Add a renderer if you want thumbnails for this template.
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
    renderHtml: renderBoldHeaderHtml, // ✅ fixes blank thumbnail
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
    // NOTE: no renderHtml → thumbnail will show "Preview unavailable"
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
    // NOTE: no renderHtml → thumbnail will show "Preview unavailable"
  },
  {
    id: 'modern-teal',
    name: 'Modern Teal Two-Column',
    category: 'Modern',
    isAtsFriendly: true,
    componentKey: 'ModernTeal',
    description: 'Teal-accent two-column layout with a focused contact rail.',
    tags: ['modern', 'teal', 'two-column'],
    component: ModernTeal,
    renderHtml: renderModernTealHtml,
  },
  {
    id: 'modern-sidebar-blue',
    name: 'Modern Blue Sidebar',
    category: 'Modern',
    isAtsFriendly: true,
    componentKey: 'ModernSidebarBlue',
    description: 'Blue sidebar with initials avatar and strong section blocks.',
    tags: ['modern', 'sidebar', 'blue'],
    component: ModernSidebarBlue,
    renderHtml: renderModernSidebarBlueHtml,
  },
  {
    id: 'ats-compact',
    name: 'Clean Compact ATS',
    category: 'ATS',
    isAtsFriendly: true,
    componentKey: 'AtsCompact',
    description: 'Compact single-column layout optimized for ATS parsing.',
    tags: ['ats', 'compact', 'single-column'],
    component: AtsCompact,
    renderHtml: renderAtsCompactHtml,
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
    // NOTE: no renderHtml → thumbnail will show "Preview unavailable"
  },
];

export const templateRegistryList: CvTemplate[] = templateRegistry.map(
  ({ component, renderHtml, ...rest }) => rest
);

export const templateRegistryById = templateRegistry.reduce((acc, template) => {
  acc[template.id] = template;
  return acc;
}, {} as Record<string, TemplateMeta>);