import type { CvDraft } from '../../types/cv';
import {
  buildCssVars as buildCssVarsJs,
  normalizeCvDraft as normalizeCvDraftJs,
  paginationCss as paginationCssJs,
  buildCvFontFaceCss as buildCvFontFaceCssJs,
  getTemplateFontAudit as getTemplateFontAuditJs,
  getTemplateFontDependencies as getTemplateFontDependenciesJs,
  getTemplateFontStack as getTemplateFontStackJs,
  resolveTemplateTypography as resolveTemplateTypographyJs,
  renderCvHtmlByTemplate as renderCvHtmlByTemplateJs,
  renderersById as renderersByIdJs,
  sanitizeRichTextHtml as sanitizeRichTextHtmlJs,
  templateMarkersById as templateMarkersByIdJs,
  buildSmartPaginationScript as buildSmartPaginationScriptJs,
  injectSmartPagination as injectSmartPaginationJs,
  smartPaginationCss as smartPaginationCssJs,
} from './index.js';

export type CvRenderer = (draft: CvDraft) => string;

export const normalizeCvDraft: (draft?: CvDraft) => CvDraft = normalizeCvDraftJs;
export const renderCvHtmlByTemplate: (draft?: CvDraft) => string = renderCvHtmlByTemplateJs;
export const renderersById: Record<string, CvRenderer> = renderersByIdJs;
export const sanitizeRichTextHtml: (input?: string) => string = sanitizeRichTextHtmlJs;
export const buildCssVars: (draft: CvDraft) => string = buildCssVarsJs;
export const paginationCss: string = paginationCssJs;
export const resolveTemplateTypography: (draft?: CvDraft) => Record<string, number> =
  resolveTemplateTypographyJs;
export const templateMarkersById: Record<string, string[]> = templateMarkersByIdJs;
export const smartPaginationCss: string = smartPaginationCssJs;
export const buildSmartPaginationScript: (options?: {
  debug?: boolean;
  notifyParent?: boolean;
}) => string = buildSmartPaginationScriptJs;
export const injectSmartPagination: (
  html: string,
  options?: { debug?: boolean; notifyParent?: boolean }
) => string = injectSmartPaginationJs;

export const buildCvFontFaceCss: (input?: { fontKeys?: string[] }) => string =
  buildCvFontFaceCssJs;
export const getTemplateFontStack: (templateId?: string) => string = getTemplateFontStackJs;
export const getTemplateFontDependencies: (templateId?: string) => string[] =
  getTemplateFontDependenciesJs;
export const getTemplateFontAudit: () =>
  Array<{ templateId: string; fontFamily: string; dependencies: string[] }> =
  getTemplateFontAuditJs;
