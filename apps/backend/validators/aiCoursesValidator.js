import Joi from 'joi';

export const outlineSchema = Joi.object({
  courseId: Joi.string().uuid().optional(),
  title: Joi.string().optional(),
  level: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
  targetMinutes: Joi.number().min(10).max(180).default(25),
});

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
});

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
  numQuestions: Joi.number().integer().min(3).max(12).default(6),
});

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
