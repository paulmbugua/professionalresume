// apps/backend/validators/aiCoursesValidator.js
import Joi from 'joi';

/** ========= Size handling ========= */
const LEGACY_TO_NEW = {
  micro: 'mini',
  short: 'standard',
  standard: 'standard',
  deep_dive: 'deep_dive',
};
const VALID_COURSE_SIZES = ['mini', 'standard', 'extended', 'deep_dive', 'bootcamp'];

/** Optional long-form program tracks */
const VALID_PROGRAM_TRACKS = ['module', 'certificate', 'diploma', 'degree'];

function normKey(v) {
  if (v === undefined || v === null) return undefined;
  return String(v).trim().toLowerCase().replace(/[\s-]+/g, '_');
}
function normalizeCourseSize(v) {
  const k = normKey(v);
  if (!k) return undefined;
  return VALID_COURSE_SIZES.includes(k) ? k : LEGACY_TO_NEW[k];
}

/** Merge legacy `size` into `courseSize` and normalize */
function mergeLegacySizeIntoCourseSize(value, helpers) {
  const out = { ...value };
  const provided = out.courseSize ?? out.size;
  if (provided != null) {
    const mapped = normalizeCourseSize(provided);
    if (!mapped) {
      return helpers.error('any.invalid', { message: 'Invalid course size' });
    }
    out.courseSize = mapped;
  }
  return out;
}

/** Shared fragments */
const keyPoint = Joi.string().trim().min(1).max(400);
const outlineSection = Joi.object({
  id: Joi.string().trim().optional(),
  title: Joi.string().trim().min(2).max(200).required(),
  keyPoints: Joi.array().items(keyPoint).max(10).default([]),
});

const level = Joi.string().valid('beginner', 'intermediate', 'advanced');
const minutes = Joi.number().integer().min(1).max(10000);
const paragraphs = Joi.number().integer().min(1).max(50);
const sentencesPerParagraph = Joi.number().integer().min(1).max(5);
const finalQuizSize = Joi.number().integer().min(1).max(200);
const totalLessons = Joi.number().integer().min(1).max(500); // cap for sanity

/** ========= OUTLINE ========= */
export const outlineSchema = Joi.object({
  courseId: Joi.string().uuid().optional(),
  title: Joi.string().trim().min(2).max(200).optional(),
  level: level.optional(),

  // Let the service derive if omitted
  targetMinutes: minutes.optional(),

  // New: either set program track or an explicit lesson count
  programTrack: Joi.string().valid(...VALID_PROGRAM_TRACKS).optional(),
  totalLessons: totalLessons.optional(),

  // New preferred field
  courseSize: Joi.string().valid(...VALID_COURSE_SIZES).optional(),
  // Legacy alias (merged to courseSize)
  size: Joi.string().valid('micro', 'short', 'standard', 'deep_dive').optional(),

  // Optional formatting / sizing hints
  paragraphs: paragraphs.optional(),
  sentencesPerParagraph: sentencesPerParagraph.optional(),
  finalQuizSize: finalQuizSize.optional(),
})
  .or('courseId', 'title')
  .custom(mergeLegacySizeIntoCourseSize, 'normalize course size');

/** ========= LESSON SSML ========= */
export const lessonSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  outline: Joi.array().items(outlineSection).min(1).required(),
  voiceName: Joi.string().trim().min(2).max(60).default('en-US-JennyNeural'),

  level: level.optional(),
  targetMinutes: minutes.optional(),

  programTrack: Joi.string().valid(...VALID_PROGRAM_TRACKS).optional(),
  totalLessons: totalLessons.optional(),

  courseSize: Joi.string().valid(...VALID_COURSE_SIZES).optional(),
  size: Joi.string().valid('micro', 'short', 'standard', 'deep_dive').optional(),

  paragraphs: paragraphs.optional(),
  sentencesPerParagraph: sentencesPerParagraph.optional(),
  finalQuizSize: finalQuizSize.optional(),

  // batching hints
  start: Joi.number().integer().min(0).optional(),
  count: Joi.number().integer().min(1).optional(),
}).custom(mergeLegacySizeIntoCourseSize, 'normalize course size');

/** ========= QUIZ ========= */
export const quizSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  outline: Joi.array().items(outlineSection).min(1).required(),

  numQuestions: Joi.number().integer().min(1).max(200).optional(),

  level: level.optional(),
  targetMinutes: minutes.optional(),

  programTrack: Joi.string().valid(...VALID_PROGRAM_TRACKS).optional(),
  totalLessons: totalLessons.optional(),

  courseSize: Joi.string().valid(...VALID_COURSE_SIZES).optional(),
  size: Joi.string().valid('micro', 'short', 'standard', 'deep_dive').optional(),

  paragraphs: paragraphs.optional(),
  sentencesPerParagraph: sentencesPerParagraph.optional(),
  finalQuizSize: finalQuizSize.optional(),
}).custom(mergeLegacySizeIntoCourseSize, 'normalize course size');

/** ========= GRADE ========= */
export const gradeSchema = Joi.object({
  quiz: Joi.object({
    questions: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().required(),
          prompt: Joi.string().required(),
          choices: Joi.array().items(Joi.string().required()).min(2).required(),
          answerIndex: Joi.number().integer().min(0).required(),
        })
      )
      .min(1)
      .required(),
  }).required(),
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.string().required(),
        choiceIndex: Joi.number().integer().min(0).required(),
      })
    )
    .min(1)
    .required(),
  passMark: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .default(Number(process.env.PASS_MARK || 70)),
});
