import Joi from 'joi';


const validCategories = [
  'Mathematics',
  'Sciences',
  'Programming',
  'Languages',
  'Art & Design',
  'Wellness',
];

const validPayoutCurrencies = ['KES', 'USD'];
const validPayoutMethods    = ['mpesa', 'stripe', 'paypal'];

// ✅ default to USD
const payoutCurrencyJoi = Joi.string().valid(...validPayoutCurrencies).default('USD');
const payoutMethodJoi   = Joi.string().valid(...validPayoutMethods);

export const profileValidationSchema = Joi.object({
  role: Joi.string().valid('tutor', 'student').required(),

  // Common
  name: Joi.string().min(2).trim().required(),
  age: Joi.when('role', {
    is: 'tutor', then: Joi.number().integer().min(18).required(),
    otherwise: Joi.number().integer().min(5).required(),
  }),
  languages: Joi.array().items(Joi.string().trim()).default([]),

  // ✅ tutors ALSO must pick whom they teach
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
    then: Joi.array().items(Joi.string()).optional(), // keep simple id list
    otherwise: Joi.forbidden(),
  }),
  experienceLevel: Joi.when('role', {
    is: 'tutor',
    then: Joi.string().valid('Beginner','Intermediate','Advanced','Expert').optional(),
    otherwise: Joi.forbidden(),
  }),
  description: Joi.when('role', {
    is: 'tutor',
    then: Joi.object({
      bio: Joi.string().min(1).required(),
      expertise: Joi.array().items(Joi.string().trim()).min(1).required(),
      teachingStyle: Joi.array().items(Joi.string().valid('One-on-One','Group','Workshop','Lecture')).min(1).required(),
    }).required(),
    otherwise: Joi.forbidden(),
  }),
  pricing: Joi.when('role', {
    is: 'tutor',
    then: Joi.object({
      privateSession: Joi.number().min(20).max(150).required(),
      groupSession:   Joi.number().min(15).max(80).required(),
      lecture:        Joi.number().min(10).max(50).required(),
      workshop:       Joi.number().min(15).max(200).required(),
    }).required(),
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
      otherwise: Joi.valid('stripe','paypal').default('stripe'),
    }),
    otherwise: Joi.forbidden(),
  }),
  stripeConnectId: Joi.when('payoutMethod', { is: 'stripe', then: Joi.string().min(5).required(), otherwise: Joi.forbidden() }),
  paypalEmail:    Joi.when('payoutMethod', { is: 'paypal', then: Joi.string().email({ tlds:false }).required(), otherwise: Joi.forbidden() }),

  // ✅ Mpesa required only for KES payouts
  mpesaPhoneNumber: Joi.when('payoutCurrency', {
    is: 'KES',
    then: Joi.string().pattern(/^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/).required(),
    otherwise: Joi.forbidden(),
  }),

  status: Joi.when('role', { is: 'tutor', then: Joi.string().valid('Online','Offline','Busy','Away','Free').optional(), otherwise: Joi.forbidden() }),
  notifications: Joi.when('role', { is: 'tutor', then: Joi.boolean().optional(), otherwise: Joi.forbidden() }),
});

// Updates: everything optional
export const profileUpdateValidationSchema = profileValidationSchema.fork(
  Object.keys(profileValidationSchema.describe().keys),
  (s) => s.optional()
);
