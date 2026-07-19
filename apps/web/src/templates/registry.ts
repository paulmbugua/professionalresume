// apps/web/src/templates/registry.ts
import React from 'react';
import type { CvDraft, CvTemplate } from '@cvpro/shared/types';
import { renderersById } from '@cvpro/shared/cv/renderers/index.js';

import AtsMinimal from '../components/cv/templates/AtsMinimal';
import ModernSidebar from '../components/cv/templates/ModernSidebar';
import BoldHeader from '../components/cv/templates/BoldHeader';
import ElegantSerif from '../components/cv/templates/ElegantSerif';
import CreativeTimeline from '../components/cv/templates/CreativeTimeline';
import CompactOnePager from '../components/cv/templates/CompactOnePager';

import ModernTeal from '../components/cv/templates/ModernTeal';
import ModernSidebarBlue from '../components/cv/templates/ModernSidebarBlue';

import AtsCompact from '../components/cv/templates/AtsCompact';
import ExecutiveBand from '../components/cv/templates/ExecutiveBand';
import SkillMatrix from '../components/cv/templates/SkillMatrix';
import AcademicCompact from '../components/cv/templates/AcademicCompact';
import ProjectForward from '../components/cv/templates/ProjectForward';
import OperationsLedger from '../components/cv/templates/OperationsLedger';
import NairobiGrid from '../components/cv/templates/NairobiGrid';
import DiplomaticClassic from '../components/cv/templates/DiplomaticClassic';
import ImpactSidebar from '../components/cv/templates/ImpactSidebar';
import AnalystDashboard from '../components/cv/templates/AnalystDashboard';
import ServicePro from '../components/cv/templates/ServicePro';
import LegalFormal from '../components/cv/templates/LegalFormal';
import ClinicalClean from '../components/cv/templates/ClinicalClean';
import PortfolioCanvas from '../components/cv/templates/PortfolioCanvas';

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
    renderHtml: renderersById['ats-minimal'],
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
    renderHtml: renderersById['modern-sidebar'],
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
    renderHtml: renderersById['bold-header'], // fixes blank thumbnail
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
    renderHtml: renderersById['elegant-serif'],
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
    renderHtml: renderersById['creative-timeline'],
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
    renderHtml: renderersById['modern-teal'],
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
    renderHtml: renderersById['modern-sidebar-blue'],
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
    renderHtml: renderersById['ats-compact'],
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
    renderHtml: renderersById['compact-one-pager'],
  },
  {
    id: 'executive-band',
    name: 'Executive Band',
    category: 'Executive',
    isAtsFriendly: true,
    componentKey: 'ExecutiveBand',
    description:
      'Polished executive layout with a strong top band and clean ATS-readable sections.',
    tags: ['executive', 'ats', 'leadership'],
    component: ExecutiveBand,
    renderHtml: renderersById['executive-band'],
  },
  {
    id: 'skill-matrix',
    name: 'Skill Matrix',
    category: 'ATS',
    isAtsFriendly: true,
    componentKey: 'SkillMatrix',
    description:
      'Skills-first resume with a structured matrix and clean single-column experience flow.',
    tags: ['ats', 'skills', 'technical'],
    component: SkillMatrix,
    renderHtml: renderersById['skill-matrix'],
  },
  {
    id: 'academic-compact',
    name: 'Academic Compact',
    category: 'Classic',
    isAtsFriendly: true,
    componentKey: 'AcademicCompact',
    description: 'Formal academic and credential-focused layout for education-heavy resumes.',
    tags: ['academic', 'classic', 'ats'],
    component: AcademicCompact,
    renderHtml: renderersById['academic-compact'],
  },
  {
    id: 'project-forward',
    name: 'Project Forward',
    category: 'Modern',
    isAtsFriendly: true,
    componentKey: 'ProjectForward',
    description:
      'Project-led resume for builders, analysts, engineers, and portfolio-driven roles.',
    tags: ['projects', 'modern', 'ats'],
    component: ProjectForward,
    renderHtml: renderersById['project-forward'],
  },
  {
    id: 'operations-ledger',
    name: 'Operations Ledger',
    category: 'Professional',
    isAtsFriendly: true,
    componentKey: 'OperationsLedger',
    description: 'Calm ledger-style resume for operations, finance, admin, and process roles.',
    tags: ['operations', 'professional', 'ats'],
    component: OperationsLedger,
    renderHtml: renderersById['operations-ledger'],
  },
  {
    id: 'nairobi-grid',
    name: 'Nairobi Grid',
    category: 'Professional',
    isAtsFriendly: true,
    componentKey: 'NairobiGrid',
    description:
      'Contemporary grid layout for Kenyan professionals who need a polished, recruiter-friendly profile.',
    tags: ['kenya', 'professional', 'grid'],
    component: NairobiGrid,
    renderHtml: renderersById['nairobi-grid'],
  },
  {
    id: 'diplomatic-classic',
    name: 'Diplomatic Classic',
    category: 'Classic',
    isAtsFriendly: true,
    componentKey: 'DiplomaticClassic',
    description:
      'Formal serif layout for government, diplomatic, policy, and institutional applications.',
    tags: ['classic', 'government', 'formal'],
    component: DiplomaticClassic,
    renderHtml: renderersById['diplomatic-classic'],
  },
  {
    id: 'impact-sidebar',
    name: 'Impact Sidebar',
    category: 'Executive',
    isAtsFriendly: true,
    componentKey: 'ImpactSidebar',
    description:
      'High-contrast sidebar design that foregrounds leadership impact and measurable results.',
    tags: ['executive', 'impact', 'sidebar'],
    component: ImpactSidebar,
    renderHtml: renderersById['impact-sidebar'],
  },
  {
    id: 'analyst-dashboard',
    name: 'Analyst Dashboard',
    category: 'Modern',
    isAtsFriendly: true,
    componentKey: 'AnalystDashboard',
    description:
      'Dashboard-inspired resume for analysts, data, finance, technology, and reporting roles.',
    tags: ['analytics', 'dashboard', 'technical'],
    component: AnalystDashboard,
    renderHtml: renderersById['analyst-dashboard'],
  },
  {
    id: 'service-pro',
    name: 'Service Pro',
    category: 'Service',
    isAtsFriendly: true,
    componentKey: 'ServicePro',
    description:
      'Warm service-focused layout for hospitality, customer care, healthcare support, and operations roles.',
    tags: ['service', 'hospitality', 'customer'],
    component: ServicePro,
    renderHtml: renderersById['service-pro'],
  },
  {
    id: 'legal-formal',
    name: 'Legal Formal',
    category: 'Classic',
    isAtsFriendly: true,
    componentKey: 'LegalFormal',
    description:
      'Conservative legal-style resume for law, compliance, governance, audit, and corporate affairs.',
    tags: ['legal', 'formal', 'compliance'],
    component: LegalFormal,
    renderHtml: renderersById['legal-formal'],
  },
  {
    id: 'clinical-clean',
    name: 'Clinical Clean',
    category: 'Healthcare',
    isAtsFriendly: true,
    componentKey: 'ClinicalClean',
    description:
      'Clean clinical layout for healthcare, nursing, public health, and technical care roles.',
    tags: ['healthcare', 'clinical', 'clean'],
    component: ClinicalClean,
    renderHtml: renderersById['clinical-clean'],
  },
  {
    id: 'portfolio-canvas',
    name: 'Portfolio Canvas',
    category: 'Creative',
    isAtsFriendly: true,
    componentKey: 'PortfolioCanvas',
    description:
      'Expressive portfolio-led layout for designers, developers, creators, and project-driven professionals.',
    tags: ['portfolio', 'creative', 'projects'],
    component: PortfolioCanvas,
    renderHtml: renderersById['portfolio-canvas'],
  },
];

export const templateRegistryList: CvTemplate[] = templateRegistry.map(
  ({ component, renderHtml, ...rest }) => rest
);

export const templateRegistryById = templateRegistry.reduce(
  (acc, template) => {
    acc[template.id] = template;
    return acc;
  },
  {} as Record<string, TemplateMeta>
);
