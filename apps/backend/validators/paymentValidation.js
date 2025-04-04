import Joi from 'joi';

const paymentValidationSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be greater than zero',
    'any.required': 'Amount is required',
  }),

  packageId: Joi.number().integer().positive().required().messages({
    'number.base': 'Package ID must be a number',
    'number.integer': 'Package ID must be an integer',
    'number.positive': 'Package ID must be greater than zero',
    'any.required': 'Package ID is required',
  }),
  phone: Joi.string()
    .pattern(/^254\d{9}$/) // Ensures a proper Kenyan format (e.g., 254712345678)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be in the format 254XXXXXXXXX',
      'any.required': 'Phone number is required',
    }),
  paymentMethod: Joi.string()
    .valid('MPESA', 'B2C', 'CARD', 'PAYPAL', 'CRYPTO')
    .required()
    .messages({
      'any.only': 'Invalid payment method',
      'any.required': 'Payment method is required',
    }),
});

const validatePayment = (data) =>
  paymentValidationSchema.validate(data, { abortEarly: false });

export default validatePayment;
