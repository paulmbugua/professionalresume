import Joi from 'joi';

// ✅ Session Validation Schema
export const sessionValidationSchema = Joi.object({
  tutorId: Joi.string().required().label('Tutor ID'),

  subject: Joi.string().trim().min(2).max(255).required().label('Subject'),

  sessionType: Joi.string()
    .valid('privateSession', 'groupSession', 'lecture', 'workshop')
    .required()
    .label('Session Type'),

  sessionCost: Joi.number()
    .precision(2)
    .positive()
    .required()
    .label('Session Cost')
    .messages({
      'number.base': 'Session cost must be a number',
      'number.positive': 'Session cost must be greater than zero',
    }),

  date: Joi.date().iso().required().label('Date').messages({
    'date.base': 'Invalid date format',
    'date.format': 'Date must be in ISO format (YYYY-MM-DDTHH:MM:SSZ)',
  }),
});

// ✅ Review Validation Schema
export const reviewValidationSchema = Joi.object({
  tutorId: Joi.string().required().label('Tutor ID'),

  comment: Joi.string().trim().max(500).required().label('Comment').messages({
    'string.max': 'Comment cannot exceed 500 characters',
  }),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .label('Rating')
    .messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot exceed 5',
    }),
});

// ✅ Complete Session Validation Schema
export const completeSessionValidationSchema = Joi.object({
  sessionId: Joi.string().required().label('Session ID'),
});
