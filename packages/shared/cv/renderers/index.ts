import type { CvDraft } from '../../types/cv';
import {
  buildCssVars as buildCssVarsJs,
  normalizeCvDraft as normalizeCvDraftJs,
  paginationCss as paginationCssJs,
  renderCvHtmlByTemplate as renderCvHtmlByTemplateJs,
  renderersById as renderersByIdJs,
  sanitizeRichTextHtml as sanitizeRichTextHtmlJs,
  templateMarkersById as templateMarkersByIdJs,
} from './index.js';

export type CvRenderer = (draft: CvDraft) => string;

export const normalizeCvDraft: (draft?: CvDraft) => CvDraft = normalizeCvDraftJs;
export const renderCvHtmlByTemplate: (draft?: CvDraft) => string = renderCvHtmlByTemplateJs;
export const renderersById: Record<string, CvRenderer> = renderersByIdJs;
export const sanitizeRichTextHtml: (input?: string) => string = sanitizeRichTextHtmlJs;
export const buildCssVars: (draft: CvDraft) => string = buildCssVarsJs;
export const paginationCss: string = paginationCssJs;
export const templateMarkersById: Record<string, string[]> = templateMarkersByIdJs;
