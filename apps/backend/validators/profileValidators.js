import Joi from 'joi';

// -------------------------------------------------------------
// Constants
// -------------------------------------------------------------
const validCategories = [
  'Mathematics',
  'Sciences',
  'Programming',
  'Languages',
  'Art & Design',
  'Wellness',
];

const validPayoutCurrencies = ['KES', 'USD'];
// Include 'wise' to match your UI; keep others if you still support them server-side.
const validPayoutMethods = ['mpesa', 'wise', 'stripe', 'paypal'];

// ✅ default to USD
const payoutCurrencyJoi = Joi.string().valid(...validPayoutCurrencies).default('USD');
const payoutMethodJoi   = Joi.string().valid(...validPayoutMethods);

// -------------------------------------------------------------
// Shared (create/update) sub-schemas
// -------------------------------------------------------------
const pricingCreateSchema = Joi.object({
  // New pricing ranges
  privateSession: Joi.number().min(5).max(50).required(),
  groupSession:   Joi.number().min(5).max(50).required(),
  workshop:       Joi.number().min(5).max(100).required(),
  lecture:        Joi.number().min(5).max(100).required(),
});

const pricingUpdateSchema = Joi.object({
  privateSession: Joi.number().min(5).max(50),
  groupSession:   Joi.number().min(5).max(50),
  workshop:       Joi.number().min(5).max(100),
  lecture:        Joi.number().min(5).max(100),
}).min(1); // if "pricing" is sent, at least one field must be present

const descriptionCreateSchema = Joi.object({
  bio: Joi.string().min(1).required(),
  expertise: Joi.array().items(Joi.string().trim()).min(1).required(),
  teachingStyle: Joi.array()
    .items(Joi.string().valid('One-on-One','Group','Workshop','Lecture'))
    .min(1)
    .required(),
});

const descriptionUpdateSchema = Joi.object({
  bio: Joi.string().min(1),
  expertise: Joi.array().items(Joi.string().trim()).min(1),
  teachingStyle: Joi.array()
    .items(Joi.string().valid('One-on-One','Group','Workshop','Lecture'))
    .min(1),
}).min(1); // if "description" is sent, at least one sub-field must be present

// -------------------------------------------------------------
// Create schema (full required fields for tutors)
// -------------------------------------------------------------
export const profileValidationSchema = Joi.object({
  role: Joi.string().valid('tutor', 'student').required(),

  // Common
  name: Joi.string().min(2).trim().required(),
  age: Joi.when('role', {
    is: 'tutor', then: Joi.number().integer().min(18).required(),
    otherwise: Joi.number().integer().min(5).required(),
  }),
  languages: Joi.array().items(Joi.string().trim()).default([]),

  // ✅ tutors ALSO must pick whom they teach; students too per your UI
  ageGroup: Joi.array().items(Joi.string().trim()).min(1).required(),

  // Tutor-only media
  gallery: Joi.when('role', {
    is: 'tutor',
    then: Joi.array()
      .items(
        Joi.string().uri({ scheme: [/https?/] })
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
    then: Joi.array().items(Joi.string()).optional(),
    otherwise: Joi.forbidden(),
  }),

  experienceLevel: Joi.when('role', {
    is: 'tutor',
    then: Joi.string().valid('Beginner','Intermediate','Advanced','Expert').optional(),
    otherwise: Joi.forbidden(),
  }),

  description: Joi.when('role', {
    is: 'tutor',
    then: descriptionCreateSchema.required(),
    otherwise: Joi.forbidden(),
  }),

  pricing: Joi.when('role', {
    is: 'tutor',
    then: pricingCreateSchema.required(),
    otherwise: Joi.forbidden(),
  }),

  // ✅ Legacy payment method: only shown/used if KES; otherwise forbid
  paymentMethod: Joi.when('role', {
    is: 'tutor',
    then: Joi.when('payoutCurrency', {
      is: 'KES',
      then: Joi.string().valid('mpesa').default('mpesa'),
      otherwise: Joi.forbidden(),
    }),
    otherwise: Joi.forbidden(),
  }),
  // ✅ Bank fields fully disabled now
  bankAccount: Joi.forbidden(),
  bankCode: Joi.forbidden(),

  // ✅ New payout prefs
  payoutCurrency: Joi.when('role', { is: 'tutor', then: payoutCurrencyJoi, otherwise: Joi.forbidden() }),
  payoutMethod: Joi.when('role', {
    is: 'tutor',
    then: payoutMethodJoi.when('payoutCurrency', {
      is: 'KES', then: Joi.valid('mpesa').default('mpesa'),
      // for USD, default to "wise" to match your UI
      otherwise: Joi.valid('wise','stripe','paypal').default('wise'),
    }),
    otherwise: Joi.forbidden(),
  }),

  // Method-specific fields
  wiseEmail: Joi.when('payoutMethod', {
    is: 'wise',
    then: Joi.string().email({ tlds: false }).required(),
    otherwise: Joi.forbidden(),
  }),
  stripeConnectId: Joi.when('payoutMethod', {
    is: 'stripe',
    then: Joi.string().min(5).required(),
    otherwise: Joi.forbidden(),
  }),
  paypalEmail: Joi.when('payoutMethod', {
    is: 'paypal',
    then: Joi.string().email({ tlds:false }).required(),
    otherwise: Joi.forbidden(),
  }),

  // ✅ Mpesa required when using M-Pesa
  mpesaPhoneNumber: Joi.when('payoutMethod', {
    is: 'mpesa',
    then: Joi.string().pattern(/^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/).required(),
    otherwise: Joi.forbidden(),
  }),

  status: Joi.when('role', {
    is: 'tutor',
    then: Joi.string().valid('Online','Offline','Busy','Away','Free').optional(),
    otherwise: Joi.forbidden(),
  }),
  notifications: Joi.when('role', {
    is: 'tutor',
    then: Joi.boolean().optional(),
    otherwise: Joi.forbidden(),
  }),
});

// -------------------------------------------------------------
// Update schema (everything optional; nested objects allow partial updates)
// -------------------------------------------------------------
export const profileUpdateValidationSchema = Joi.object({
  role: Joi.string().valid('tutor', 'student'),

  name: Joi.string().min(2).trim(),
  age: Joi.number().integer().min(5), // if you need tutor/student split on update, you can keep the when() logic

  languages: Joi.array().items(Joi.string().trim()),
  ageGroup: Joi.array().items(Joi.string().trim()).min(1),

  gallery: Joi.array().items(
    Joi.string().uri({ scheme: [/https?/] })
      .allow(Joi.string().pattern(/^\/.+/))
      .message('"gallery" entries must be valid URLs or start with "/"')
  ).min(1),

  video: Joi.string()
    .uri({ scheme: [/https?/] })
    .allow('', null, Joi.string().pattern(/^\/.+/))
    .message('"video" must be a valid URL or start with "/"'),

  category: Joi.string().valid(...validCategories),

  recommended: Joi.array().items(Joi.string()),
  experienceLevel: Joi.string().valid('Beginner','Intermediate','Advanced','Expert'),

  description: descriptionUpdateSchema,  // ✅ partial allowed
  pricing: pricingUpdateSchema,          // ✅ partial allowed

  // payout prefs
  payoutCurrency: payoutCurrencyJoi,
  payoutMethod: payoutMethodJoi.when('payoutCurrency', {
    is: 'KES', then: Joi.valid('mpesa'),
    otherwise: Joi.valid('wise','stripe','paypal'),
  }),

  wiseEmail: Joi.when('payoutMethod', {
    is: 'wise',
    then: Joi.string().email({ tlds: false }).required(),
    otherwise: Joi.forbidden(),
  }),
  stripeConnectId: Joi.when('payoutMethod', {
    is: 'stripe',
    then: Joi.string().min(5).required(),
    otherwise: Joi.forbidden(),
  }),
  paypalEmail: Joi.when('payoutMethod', {
    is: 'paypal',
    then: Joi.string().email({ tlds:false }).required(),
    otherwise: Joi.forbidden(),
  }),
  mpesaPhoneNumber: Joi.when('payoutMethod', {
    is: 'mpesa',
    then: Joi.string().pattern(/^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/).required(),
    otherwise: Joi.forbidden(),
  }),

  status: Joi.string().valid('Online','Offline','Busy','Away','Free'),
  notifications: Joi.boolean(),
});
