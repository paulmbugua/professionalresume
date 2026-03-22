import Joi from 'joi';

const hexColor = Joi.string().pattern(/^#(?:[0-9a-fA-F]{3}){1,2}$/);

const basicsSchema = Joi.object({
  fullName: Joi.string().max(120).allow(''),
  email: Joi.string().email().allow(''),
  phone: Joi.string().max(40).allow(''),
  location: Joi.string().max(120).allow(''),
  companyName: Joi.string().max(140).allow(''),
  hiringManager: Joi.string().max(120).allow(''),
  jobTitle: Joi.string().max(140).allow(''),
  date: Joi.string().allow(''),
});

const contentSchema = Joi.object({
  opening: Joi.string().max(5000).allow(''),
  body: Joi.array().items(Joi.string().max(5000).allow('')).max(8),
  closing: Joi.string().max(5000).allow(''),
  signature: Joi.string().max(120).allow(''),
  highlights: Joi.array().items(Joi.string().max(300).allow('')).max(20),
});

const designSchema = Joi.object({
  tone: Joi.string().valid('professional', 'confident', 'friendly').default('professional'),
  fontFamily: Joi.string().max(120).allow('').default('Inter, system-ui, Arial'),
  fontSize: Joi.number().min(10).max(16).default(12),
  lineHeight: Joi.number().min(1.2).max(1.8).default(1.5),
  textColor: hexColor.default('#0f172a'),
  accentColor: hexColor.default('#0f766e'),
  paragraphSpacing: Joi.number().min(0).max(32).default(12),
  margins: Joi.object({
    top: Joi.number().min(8).max(72).default(32),
    right: Joi.number().min(8).max(72).default(32),
    bottom: Joi.number().min(8).max(72).default(32),
    left: Joi.number().min(8).max(72).default(32),
  }).default(),
}).default();

const visibilityKeys = ['header', 'opening', 'body', 'closing', 'signature'];

export const createCoverLetterSchema = Joi.object({
  title: Joi.string().max(140).allow('').optional(),
  templateKey: Joi.string().default('classic-letter'),
  data: Joi.object({
    applicantName: Joi.string().max(120).allow('').default(''),
    applicantEmail: Joi.string().email().allow('').default(''),
    applicantPhone: Joi.string().max(40).allow('').default(''),
    applicantLocation: Joi.string().max(120).allow('').default(''),
    recipientName: Joi.string().max(120).allow('').default(''),
    companyName: Joi.string().max(140).allow('').default(''),
    roleTitle: Joi.string().max(140).allow('').default(''),
    letterBody: Joi.string().max(12000).allow('').default(''),
    closingLine: Joi.string().max(200).allow('').default(''),
  })
    .default()
    .unknown(false),
});

export const patchCoverLetterSchema = Joi.object({
  title: Joi.string().max(140).allow(''),
  templateKey: Joi.string(),
  data: Joi.object({
    applicantName: Joi.string().max(120).allow(''),
    applicantEmail: Joi.string().email().allow(''),
    applicantPhone: Joi.string().max(40).allow(''),
    applicantLocation: Joi.string().max(120).allow(''),
    recipientName: Joi.string().max(120).allow(''),
    companyName: Joi.string().max(140).allow(''),
    roleTitle: Joi.string().max(140).allow(''),
    letterBody: Joi.string().max(12000).allow(''),
    closingLine: Joi.string().max(200).allow(''),
  }).unknown(false),
}).min(1);

export const coverLetterExportSchema = Joi.object({
  draftId: Joi.string().guid({ version: ['uuidv4', 'uuidv5'] }).optional(),
  coverLetterJson: Joi.object({
    basics: basicsSchema,
    content: contentSchema,
    design: designSchema,
  }).optional(),
  fileName: Joi.string().max(180).allow('').optional(),
}).or('draftId', 'coverLetterJson');

export const coverLetterAiRequestSchema = Joi.object({
  prompt: Joi.string().max(4000).required(),
  target: Joi.string().valid('opening', 'body', 'closing', 'full').default('full'),
  context: Joi.object({
    basics: basicsSchema,
    content: contentSchema,
    design: designSchema,
  }).default(),
  jobDescription: Joi.string().max(8000).allow('').default(''),
});
