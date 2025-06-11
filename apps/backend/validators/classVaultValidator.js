// apps/backend/validators/classVaultValidator.js
import Joi from 'joi';

export const classVaultValidationSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  /* … all your other fields … */
  video_url: Joi.string().uri()
    .when('pdf_url', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
  pdf_url: Joi.string().uri().optional(),
  preview_url: Joi.string().uri().optional(),
  thumbnail_url: Joi.string().uri().optional(),
});

// now re-add the “update” variant:
export const classVaultUpdateValidationSchema =
  classVaultValidationSchema.fork(
    Object.keys(classVaultValidationSchema.describe().keys),
    (schema) => schema.optional()
  );
