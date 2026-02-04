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
};

export type CvTemplateResponse = {
  templates: CvTemplate[];
  source?: 'db' | 'local';
  fallback?: boolean;
};
