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
