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

export const createDraftSchema = Joi.object({
  templateId: Joi.string().required(),
  title: Joi.string().allow('').optional(),
  data: Joi.object().optional(),
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
