import Joi from 'joi';

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

  comment: Joi.string().trim().max(500).optional().messages({
    'string.max': 'Comment cannot exceed 500 characters',
  }),
});
