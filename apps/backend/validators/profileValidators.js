import Joi from 'joi';

const validCategories = [
  'Math Tutor',
  'Sciences',
  'Programming',
  'Languages',
  'Art & Design',
  'Wellness',
];
const validExperienceLevels = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];
const validStatus = ['Online', 'Offline', 'Busy', 'Away', 'Free'];
const validTeachingStyles = ['One-on-One', 'Group', 'Workshop', 'Lecture'];
const validPaymentMethods = ['bank', 'mpesa'];

const pricingSchema = Joi.object({
  privateSession: Joi.number().min(20).max(150).required(),
  groupSession:   Joi.number().min(15).max(80).required(),
  lecture:        Joi.number().min(10).max(50).required(),
  workshop:       Joi.number().min(15).max(200).required(),
});

const descriptionSchema = Joi.object({
  bio: Joi.string().min(1).required(),
  expertise: Joi.array().items(Joi.string().trim()).min(1).required(),
  teachingStyle: Joi.array()
    .items(Joi.string().valid(...validTeachingStyles))
    .min(1)
    .required(),
});

export const profileValidationSchema = Joi.object({
  role: Joi.string().valid('tutor', 'student').required(),

  // Common fields
  name: Joi.string().min(2).trim().required(),
  age: Joi.when('role', {
    is: 'tutor',
    then: Joi.number().integer().min(18).required(),
    otherwise: Joi.number().integer().min(5).required(),
  }),
  languages: Joi.array().items(Joi.string().trim()).default([]),
  ageGroup:  Joi.array().items(Joi.string().trim()).min(1).required(),

  // Tutor-specific fields
  gallery: Joi.when('role', {
    is: 'tutor',
    then: Joi.array()
      .items(
        Joi.string()
          // allow both absolute (http/https) and relative URLs
          .uri({ scheme: [/https?/] })
          .allow(Joi.string().pattern(/^\/.+/))  
          .message('"gallery" entries must be valid URLs or start with "/"')
      )
      .min(1)
      .required(),
    otherwise: Joi.forbidden(),
  }),

  video: Joi.when('role', {
    is: 'tutor',
    then: Joi.string()
      .uri({ scheme: [/https?/] })
      .allow('', null, Joi.string().pattern(/^\/.+/))
      .message('"video" must be a valid URL or start with "/"'),
    otherwise: Joi.forbidden(),
  }),

  category: Joi.when('role', {
    is: 'tutor',
    then: Joi.string().valid(...validCategories).required(),
    otherwise: Joi.forbidden(),
  }),

  recommended: Joi.when('role', {
    is: 'tutor',
    then: Joi.array()
      .items(
        Joi.string()
          .uuid()
          .messages({ 'string.uuid': '"recommended" items must be valid UUIDs' })
      )
      .optional(),
    otherwise: Joi.forbidden(),
  }),

  experienceLevel: Joi.when('role', {
    is: 'tutor',
    then: Joi.string().valid(...validExperienceLevels).optional(),
    otherwise: Joi.forbidden(),
  }),

  description: Joi.when('role', {
    is: 'tutor',
    then: descriptionSchema.required(),
    otherwise: Joi.forbidden(),
  }),

  pricing: Joi.when('role', {
    is: 'tutor',
    then: pricingSchema.required(),
    otherwise: Joi.forbidden(),
  }),

  paymentMethod: Joi.when('role', {
    is: 'tutor',
    then: Joi.string().valid(...validPaymentMethods).required(),
    otherwise: Joi.forbidden(),
  }),

  bankAccount: Joi.when('paymentMethod', {
    is: 'bank',
    then: Joi.string().pattern(/^\d{6,}$/).required(),
    otherwise: Joi.forbidden(),
  }),

  bankCode: Joi.when('paymentMethod', {
    is: 'bank',
    then: Joi.string().min(3).max(10).required(),
    otherwise: Joi.forbidden(),
  }),

  mpesaPhoneNumber: Joi.when('paymentMethod', {
    is: 'mpesa',
    then: Joi.string()
      .pattern(/^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/)
      .required()
      .messages({
        'string.pattern.base':
          'M-Pesa phone number must be in one of the formats: 07XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX, 01XXXXXXXX, 2541XXXXXXXX, or +2541XXXXXXXX.',
      }),
    otherwise: Joi.forbidden(),
  }),

  status: Joi.when('role', {
    is: 'tutor',
    then: Joi.string().valid(...validStatus).optional(),
    otherwise: Joi.forbidden(),
  }),

  notifications: Joi.when('role', {
    is: 'tutor',
    then: Joi.boolean().optional(),
    otherwise: Joi.forbidden(),
  }),
});

// For updates: make all keys optional
export const profileUpdateValidationSchema = profileValidationSchema.fork(
  Object.keys(profileValidationSchema.describe().keys),
  (schema) => schema.optional()
);
