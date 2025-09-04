import Joi from 'joi';

/** ========= Size handling ========= */
const LEGACY_TO_NEW = {
  micro: 'mini',
  short: 'standard',
  standard: 'standard',
  deep_dive: 'deep_dive',
};
const VALID_COURSE_SIZES = ['mini', 'standard', 'extended', 'deep_dive', 'bootcamp'];

function normalizeCourseSize(v) {
  if (!v) return undefined;
  const key = String(v).toLowerCase();
  return VALID_COURSE_SIZES.includes(key) ? key : LEGACY_TO_NEW[key];
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

/** Shared knobs for narration formatting (kept) */
const paragraphs = Joi.number().integer().min(8).max(24);
const sentencesPerParagraph = Joi.number().integer().min(1).max(3);
const finalQuizSize = Joi.number().integer().min(4).max(40);

/** ========= OUTLINE =========
 * Accepts `courseSize` (new) + legacy `size` (mapped to courseSize).
 */
export const outlineSchema = Joi.object({
  courseId: Joi.string().uuid().optional(),
  title: Joi.string().optional(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),

  // Let the service derive from size if omitted
  targetMinutes: Joi.number().min(8).max(600).optional(),

  // New preferred field
  courseSize: Joi.string().valid(...VALID_COURSE_SIZES).optional(),

  // Legacy alias (will be merged/mapped to courseSize)
  courseSize: Joi.string().valid('mini','standard','extended','deep_dive','bootcamp').optional(),

  // Optional formatting / sizing hints
  paragraphs: paragraphs.optional(),
  sentencesPerParagraph: sentencesPerParagraph.optional(),
  finalQuizSize: finalQuizSize.optional(),
}).custom(mergeLegacySizeIntoCourseSize, 'normalize course size');

/** ========= LESSON SSML =========
 * Adds `courseSize` + legacy `size` (mapped).
 */
export const lessonSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  outline: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required(),
        keyPoints: Joi.array().items(Joi.string().min(1)).min(1).required(),
      })
    )
    .min(1)
    .required(),
  voiceName: Joi.string().default('en-US-JennyNeural'),

  level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  targetMinutes: Joi.number().min(8).max(600).optional(),

  courseSize: Joi.string().valid(...VALID_COURSE_SIZES).optional(),
  size: Joi.string().valid('micro', 'short', 'standard', 'deep_dive').optional(),

  paragraphs: paragraphs.optional(),
  sentencesPerParagraph: sentencesPerParagraph.optional(),
  finalQuizSize: finalQuizSize.optional(),

  // Generate only the first N lessons now (controller also accepts query param)
  count: Joi.number().integer().min(1).optional(),
}).custom(mergeLegacySizeIntoCourseSize, 'normalize course size');

/** ========= QUIZ =========
 * Accepts `courseSize` + legacy `size` (mapped).
 */
export const quizSchema = Joi.object({
  courseId: Joi.string().uuid().required(),
  outline: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        title: Joi.string().required(),
        keyPoints: Joi.array().items(Joi.string().min(1)).min(1).required(),
      })
    )
    .min(1)
    .required(),

  // Controller/service will compute a default from size if omitted
  numQuestions: Joi.number().integer().min(3).max(40).optional(),

  level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
  targetMinutes: Joi.number().min(8).max(600).optional(),

  courseSize: Joi.string().valid(...VALID_COURSE_SIZES).optional(),
  size: Joi.string().valid('micro', 'short', 'standard', 'deep_dive').optional(),

  paragraphs: paragraphs.optional(),
  sentencesPerParagraph: sentencesPerParagraph.optional(),
  finalQuizSize: finalQuizSize.optional(),
}).custom(mergeLegacySizeIntoCourseSize, 'normalize course size');

/** ========= GRADE ========= (unchanged) */
export const gradeSchema = Joi.object({
  quiz: Joi.object({
    questions: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().required(),
          prompt: Joi.string().required(),
          choices: Joi.array().items(Joi.string()).min(2).required(),
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
    .required(),
  passMark: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(Number(process.env.PASS_MARK || 70)),
});
