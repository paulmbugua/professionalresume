import {
  renderCoverLetterHtmlByTemplate as renderCoverLetterHtmlByTemplateJs,
  renderersById as renderersByIdJs,
  templateMarkersById as templateMarkersByIdJs,
  normalizeCoverLetterTemplateId as normalizeCoverLetterTemplateIdJs,
} from './index.js';

export type CoverLetterRenderer = (draft?: Record<string, unknown>) => string;

export const renderersById: Record<string, CoverLetterRenderer> = renderersByIdJs;
export const renderCoverLetterHtmlByTemplate: (draft?: Record<string, unknown>) => string =
  renderCoverLetterHtmlByTemplateJs;
export const templateMarkersById: Record<string, string[]> = templateMarkersByIdJs;

export const normalizeCoverLetterTemplateId: (templateId?: string) => string =
  normalizeCoverLetterTemplateIdJs;
