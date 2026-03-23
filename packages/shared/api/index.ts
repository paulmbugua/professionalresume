// packages/shared/api/index.ts

export * from './authApi';
export * from './manageProfileApi';
export * from './messagesApi';
export * from './paymentApi';
export * from './profileActionsApi';
export * from './profileApi';
export * from './profileCardApi';

// CV API surface
export {
  listCvTemplates,
  listMyCvDrafts,
  getCvDraft,
  createCvDraft,
  updateCvDraft,
  deleteCvDraft,
  exportCvPdf,
  signCvFile,
  getCvPrintHtml,
  getCoverLetterEntitlement,
} from './cvApi';

// Cover-letter API surface
export {
  listCoverLetterTemplates,
  listMyCoverLetterDrafts,
  getCoverLetterDraft,
  createCoverLetterDraft,
  updateCoverLetterDraft,
  deleteCoverLetterDraft,
  getCoverLetterPrintHtml,
  exportCoverLetterPdf,
  toCoverLetterExportJson,
  signCoverLetterFile,
  aiGenerateCoverLetter,
  aiRewriteCoverLetter,
} from './coverLetterApi';

// CV AI API surface
export {
  aiGenerateSummary,
  aiRewriteBullet,
  aiSuggestSkills,
  aiRewriteCoverLetterStyle,
  aiImproveCoverLetterParagraph,
  aiSuggestCoverLetterSubjectLines,
  aiSuggestCoverLetterGreetingClosing,
  aiGenerateCoverLetter as aiGenerateLegacyCoverLetter,
} from './aiCvApi';

export * from './cvPaymentApi';
