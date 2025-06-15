// apps/backend/validators/classVaultValidator.js

import Joi from 'joi'

// A string that is either:
//  • an absolute URL (http:// or https://…)
//  • or a relative path, e.g. "/uploads/file.mp4" or "uploads/file.mp4"
//    allowing percent-encoded sequences like "%20" in filenames
const uriOrRelative = Joi.alternatives().try(
  // 1) absolute HTTP/HTTPS URL
  Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .message('must be a valid absolute URL (http:// or https://…)'),
  // 2) simple relative file path, with optional leading slash, segments of [A-Za-z0-9, %, -], and a final extension
  Joi.string()
    .pattern(/^(\/?[A-Za-z0-9_%\-\.+]+\/)*[A-Za-z0-9_%\-\.+]+\.[A-Za-z0-9]+$/)
    .message('must be a relative path like "/uploads/file.mp4" (percent-encoding, underscores and dots allowed)')
)

export const classVaultValidationSchema = Joi.object({
  title:        Joi.string().min(3).max(255).required(),
  subject:      Joi.string().required(),
  grade_level:  Joi.string().required(),
  price:        Joi.number().integer().required(),
  duration:     Joi.number().integer().optional(),
  tags:         Joi.array().items(Joi.string()).optional(),

  video_url: uriOrRelative
    .required()
    .messages({ 'any.required': '"video_url" is required' }),

  pdf_url:       uriOrRelative.empty('').optional(),
  preview_url:   uriOrRelative.optional(),
  thumbnail_url: uriOrRelative.optional(),
})

// For PATCH/PUT: make every field optional
export const classVaultUpdateValidationSchema =
  classVaultValidationSchema.fork(
    Object.keys(classVaultValidationSchema.describe().keys),
    schema => schema.optional()
  )

  
