import Joi from 'joi';

/**
 * ✅ Tutor review schema
 * Expects: tutorId, rating, (optional) sessionId + comment
 */
export const reviewValidationSchema = Joi.object({
  tutorId: Joi.string()
    .required()
    .messages({ 'any.required': 'Tutor ID is required' }),

  sessionId: Joi.string().optional(),

  rating: Joi.number().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required',
  }),

  // 👇 Optional, allow empty string too
  comment: Joi.string().trim().allow('').max(500).optional().messages({
    'string.max': 'Comment cannot exceed 500 characters',
  }),
});

/**
 * ✅ Shared schema for video & course reviews
 * Expects: rating, (optional) comment
 */
export const starOnlySchema = Joi.object({
  rating: Joi.number().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1',
    'number.max': 'Rating cannot exceed 5',
    'any.required': 'Rating is required',
  }),

  // 👇 Optional, allow empty string too
  comment: Joi.string().trim().allow('').max(500).optional().messages({
    'string.max': 'Comment cannot exceed 500 characters',
  }),
});
