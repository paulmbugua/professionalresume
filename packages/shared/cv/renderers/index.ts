import type { CvDraft } from '../../types/cv';
import {
  normalizeCvDraft as normalizeCvDraftJs,
  renderCvHtmlByTemplate as renderCvHtmlByTemplateJs,
  renderersById as renderersByIdJs,
} from './index.js';

export type CvRenderer = (draft: CvDraft) => string;

export const normalizeCvDraft: (draft?: CvDraft) => CvDraft = normalizeCvDraftJs;
export const renderCvHtmlByTemplate: (draft?: CvDraft) => string = renderCvHtmlByTemplateJs;
export const renderersById: Record<string, CvRenderer> = renderersByIdJs;
