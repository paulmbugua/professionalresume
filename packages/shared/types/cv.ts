export type CvLink = {
  label: string;
  url: string;
};

export type CvExperience = {
  company: string;
  role: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  bullets: string[];
};

export type CvEducation = {
  school: string;
  program: string;
  start: string;
  end: string;
  details?: string;
};

export type CvProject = {
  name: string;
  link?: string;
  description: string;
  bullets: string[];
};

export type CvCertification = {
  name: string;
  issuer?: string;
  year?: string;
};

export type CvExtras = {
  languages?: string[];
  interests?: string[];
};

export type CvTypography = {
  baseFontSize: number;
  h1Size: number;
  h2Size: number;
  h3Size: number;
  bodySize: number;
  lineHeight?: number;
  fontFamily?: string;
};

export type CvFormattingDefaults = {
  textColor: string;
  mutedTextColor: string;
  linkColor: string;
};

export type CvTemplateTheme = {
  primary: string;
  secondary?: string;
  accent?: string;
  headerBg?: string;
  headerText?: string;
  sidebarBg?: string;
  sidebarText?: string;
  sectionBg?: string;
  borderColor?: string;
};

export type CvRichTextMap = Record<string, string>;

export type CvSectionKey =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'education'
  | 'projects'
  | 'certifications'
  | 'extras';

export type CvDraftMeta = {
  isDemoSeeded?: boolean;
  hasImportedCv?: boolean;
  importedAt?: string;
  importMode?: 'merge' | 'replace';
};

export type CvDraft = {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  updatedAt: string;
  createdAt?: string;
  version?: number;
  basics: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    links: CvLink[];
    photoUrl?: string;
  };
  summary: string;
  skills: string[];
  experience: CvExperience[];
  education: CvEducation[];
  projects: CvProject[];
  certifications: CvCertification[];
  extras: CvExtras;
  typography?: CvTypography;
  formatting?: CvFormattingDefaults;
  templateTheme?: CvTemplateTheme;
  richText?: CvRichTextMap;
  meta?: CvDraftMeta;
  sectionOrder: CvSectionKey[];
  sectionVisibility: Record<CvSectionKey, boolean>;
};

export type CvTemplate = {
  id: string;
  name: string;
  category: string;
  isAtsFriendly: boolean;
  previewImage?: string;
  componentKey: string;
  description?: string;
};

export type CvTemplateResponse = {
  templates: CvTemplate[];
  source?: 'db' | 'local';
  fallback?: boolean;
};

export type CvExportResponse = {
  url: string | null;
  fileKey: string;
  signedUrl?: string;
  bytes?: number;
  mimeType?: string;
};

export type CoverLetterTemplateId = 'classic-letter' | 'modern-accent';

export type CoverLetterDraft = {
  id: string;
  userId: string;
  title: string;
  templateId: CoverLetterTemplateId;
  updatedAt: string;
  createdAt?: string;
  sender: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
  };
  recipient: {
    name: string;
    title: string;
    company: string;
    address: string;
  };
  letter: {
    role: string;
    date: string;
    subject: string;
    greeting: string;
    signoff: string;
  };
  body: {
    opening: string;
    middleParagraphs: string[];
    closing: string;
  };
  style: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    accentColor: string;
    pageTheme: 'light' | 'warm';
  };
};

export type CoverLetterExportResponse = {
  url: string | null;
  fileKey: string;
  signedUrl?: string;
};
