import Joi from 'joi';

export const manualAwardSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  courseId: Joi.string().uuid().allow(null, ''), // platform-wide badges allowed
  title: Joi.string().trim().min(2).max(120).required(),
  iconUrl: Joi.string().uri().allow(null, ''),
});

// For POST /achievements/unlock (current user)
export const unlockAchievementSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  title: Joi.string().trim().min(2).max(120).required(),
  iconUrl: Joi.string().uri().allow(null, ''),
});
