import Joi from 'joi';

const sectionKeys = [
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'extras',
];

const linkSchema = Joi.object({
  label: Joi.string().allow(''),
  url: Joi.string().allow(''),
});

const experienceSchema = Joi.object({
  company: Joi.string().allow(''),
  role: Joi.string().allow(''),
  start: Joi.string().allow(''),
  end: Joi.string().allow(''),
  location: Joi.string().allow(''),
  description: Joi.string().allow(''),
  bullets: Joi.array().items(Joi.string().allow('')),
});

const educationSchema = Joi.object({
  school: Joi.string().allow(''),
  program: Joi.string().allow(''),
  start: Joi.string().allow(''),
  end: Joi.string().allow(''),
  details: Joi.string().allow(''),
});

const projectSchema = Joi.object({
  name: Joi.string().allow(''),
  link: Joi.string().allow(''),
  description: Joi.string().allow(''),
  bullets: Joi.array().items(Joi.string().allow('')),
});

const certificationSchema = Joi.object({
  name: Joi.string().allow(''),
  issuer: Joi.string().allow(''),
  year: Joi.string().allow(''),
});

const coverLetterSchema = Joi.object({
  subject: Joi.string().allow(''),
  greeting: Joi.string().allow(''),
  body: Joi.string().allow(''),
  closing: Joi.string().allow(''),
});

const aiMetaSchema = Joi.object({
  coverLetter: Joi.object({
    lastAction: Joi.string().allow(''),
    lastModel: Joi.string().allow(''),
    lastUpdatedAt: Joi.string().allow(''),
  }).optional(),
}).unknown(true);

const hexColor = Joi.string().pattern(/^#(?:[0-9a-fA-F]{3}){1,2}$/);

const typographySchema = Joi.object({
  baseFontSize: Joi.number().min(10).max(16),
  h1Size: Joi.number().min(18).max(34),
  h2Size: Joi.number().min(10).max(24),
  h3Size: Joi.number().min(9).max(20),
  bodySize: Joi.number().min(10).max(16),
  lineHeight: Joi.number().min(1.3).max(1.65),
  fontFamily: Joi.string().max(120).allow(''),
});

const formattingSchema = Joi.object({
  textColor: hexColor,
  mutedTextColor: hexColor,
  linkColor: hexColor,
});

const templateThemeSchema = Joi.object({
  primary: hexColor,
  secondary: hexColor,
  accent: hexColor,
  headerBg: hexColor,
  headerText: hexColor,
  sidebarBg: hexColor,
  sidebarText: hexColor,
  sectionBg: hexColor,
  borderColor: hexColor,
});

export const createDraftSchema = Joi.object({
  templateId: Joi.string().required(),
  title: Joi.string().allow('').optional(),
  data: Joi.object().optional(),
  clientDraftId: Joi.string().max(120).optional(),
});

export const draftPatchSchema = Joi.object({
  title: Joi.string().allow(''),
  templateId: Joi.string(),
  basics: Joi.object({
    name: Joi.string().allow(''),
    headline: Joi.string().allow(''),
    email: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    location: Joi.string().allow(''),
    links: Joi.array().items(linkSchema),
    photoUrl: Joi.string().uri({ scheme: ['https'] }).allow(''),
  }),
  summary: Joi.string().allow(''),
  skills: Joi.array().items(Joi.string().allow('')),
  experience: Joi.array().items(experienceSchema),
  education: Joi.array().items(educationSchema),
  projects: Joi.array().items(projectSchema),
  certifications: Joi.array().items(certificationSchema),
  extras: Joi.object({
    languages: Joi.array().items(Joi.string().allow('')),
    interests: Joi.array().items(Joi.string().allow('')),
  }),
  typography: typographySchema,
  formatting: formattingSchema,
  templateTheme: templateThemeSchema,
  richText: Joi.object().pattern(Joi.string(), Joi.string().allow('')),
  coverLetter: coverLetterSchema,
  aiMeta: aiMetaSchema,
  generationMeta: Joi.object().unknown(true),
  sectionOrder: Joi.array().items(Joi.string().valid(...sectionKeys)),
  sectionVisibility: Joi.object().pattern(
    Joi.string().valid(...sectionKeys),
    Joi.boolean(),
  ),
}).min(1);

export const cvExportSchema = Joi.object({
  draftId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).optional(),
  cvJson: Joi.object().optional(),
  fileName: Joi.string().allow('').optional(),
}).or('draftId', 'cvJson');

export const templateUploadSchema = Joi.object({
  key: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().allow('').optional(),
  previewUrl: Joi.string().uri().allow('').optional(),
});

export const coverLetterExportDataSchema = Joi.object({
  applicantName: Joi.string().allow('').required(),
  applicantEmail: Joi.string().allow(''),
  applicantPhone: Joi.string().allow(''),
  applicantLocation: Joi.string().allow(''),
  recipientName: Joi.string().allow(''),
  companyName: Joi.string().allow(''),
  roleTitle: Joi.string().allow(''),
  letterBody: Joi.string().allow('').required(),
  closingLine: Joi.string().allow(''),
});

export const coverLetterExportSchema = Joi.object({
  coverLetterJson: coverLetterExportDataSchema.required(),
});


export const aiSummarySchema = Joi.object({
  draft: Joi.object().required(),
});

export const aiRewriteSchema = Joi.object({
  context: Joi.string().allow('').required(),
  bullet: Joi.string().allow('').required(),
});

export const aiSuggestSkillsSchema = Joi.object({
  draft: Joi.object().required(),
});

export const aiJobRequirementAssistSchema = Joi.object({
  draft: Joi.object().required(),
  jobAdvertText: Joi.string().trim().min(40).required(),
  regenerate: Joi.boolean().optional().default(false),
});

const coverLetterStyleSchema = Joi.string()
  .valid('professional', 'concise', 'confident', 'ats-friendly')
  .required();

export const aiCoverLetterGenerateSchema = Joi.object({
  jobTitle: Joi.string().allow('').required(),
  company: Joi.string().allow('').required(),
  experience: Joi.string().allow('').required(),
  tone: Joi.string().allow('').required(),
  seniority: Joi.string().allow('').required(),
});

export const aiCoverLetterRewriteSchema = Joi.object({
  body: Joi.string().allow('').required(),
  style: coverLetterStyleSchema,
});

export const aiCoverLetterParagraphSchema = Joi.object({
  paragraph: Joi.string().allow('').required(),
  context: Joi.string().allow('').optional(),
});

export const aiCoverLetterSubjectSchema = Joi.object({
  body: Joi.string().allow('').required(),
  jobTitle: Joi.string().allow('').optional(),
  company: Joi.string().allow('').optional(),
});

export const aiCoverLetterGreetingClosingSchema = Joi.object({
  body: Joi.string().allow('').required(),
  jobTitle: Joi.string().allow('').optional(),
  company: Joi.string().allow('').optional(),
});
