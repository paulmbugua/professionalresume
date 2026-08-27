import {
  aiCoverLetterGenerateSchema,
  aiCoverLetterRewriteSchema,
  aiCoverLetterParagraphSchema,
  aiCoverLetterSubjectSchema,
  aiCoverLetterGreetingClosingSchema,
} from '../validators/cvValidators.js';

import {
  generateCoverLetter,
  rewriteCoverLetterStyle,
  improveCoverLetterParagraph,
  suggestCoverLetterSubjectLines,
  suggestCoverLetterGreetingClosing,
} from '../services/aiCoverLetterService.js';

import {
  retrieveTextSources,
} from '../services/aiLabRagService.js';

/**
 * Convert Joi validation errors into a consistent API response.
 */
function validationError(res, error) {
  return res.status(400).json({
    error:
      error?.details?.[0]?.message ||
      error?.message ||
      'Invalid request',
  });
}

/**
 * Build readable text for the RAG retriever.
 *
 * Keeping the fields labelled makes retrieval more useful than
 * passing an opaque JSON object alone.
 */
function buildCoverLetterContext(value = {}) {
  const parts = [];

  if (value.jobTitle) {
    parts.push(`Target job title: ${value.jobTitle}`);
  }

  if (value.company) {
    parts.push(`Target company: ${value.company}`);
  }

  if (value.seniority) {
    parts.push(`Seniority: ${value.seniority}`);
  }

  if (value.tone) {
    parts.push(`Requested tone: ${value.tone}`);
  }

  if (value.experience) {
    parts.push(`Candidate experience:\n${value.experience}`);
  }

  return parts.join('\n\n').trim();
}

/**
 * Build a retrieval query from the validated request.
 */
function buildGroundingQuery(value = {}) {
  const parts = [
    value.jobTitle,
    value.company,
    value.seniority,
    value.experience,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  if (!parts.length) {
    return 'cover letter candidate experience and job requirements';
  }

  return [
    'Find the strongest factual evidence for a tailored cover letter.',
    ...parts,
  ]
    .join(' ')
    .slice(0, 4000);
}

/**
 * Retrieve factual evidence for cover-letter generation.
 *
 * RAG should improve generation, but a temporary retrieval or
 * embedding failure should not take down the endpoint.
 */
async function grounding(query, sources) {
  try {
    return await retrieveTextSources({
      query,
      sources,
      limit: 8,
    });
  } catch (error) {
    console.warn(
      '[ai-cover-letter] grounding skipped:',
      error?.message || error
    );

    return [];
  }
}

/**
 * POST /api/.../cover-letter/generate
 *
 * Generate a complete tailored cover letter.
 */
export async function aiCoverLetterGenerate(req, res) {
  try {
    const { error, value } =
      aiCoverLetterGenerateSchema.validate(
        req.body || {},
        {
          abortEarly: true,
          stripUnknown: true,
        }
      );

    if (error) {
      return validationError(res, error);
    }

    const context = buildCoverLetterContext(value);

    const passages = context
      ? await grounding(
          buildGroundingQuery(value),
          [
            {
              filename: 'CV and job context',
              text: context,
            },
          ]
        )
      : [];

    const suggestion = await generateCoverLetter({
      ...value,
      grounding: passages,
    });

    return res.json({
      suggestion,

      grounding: {
        sourceCount: passages.length,
      },
    });
  } catch (err) {
    console.error(
      'aiCoverLetterGenerate error:',
      err
    );

    return res.status(500).json({
      error: 'Failed to generate cover letter',
    });
  }
}

/**
 * POST /api/.../cover-letter/rewrite
 *
 * Rewrite an existing cover letter into the requested style.
 */
export async function aiCoverLetterRewrite(req, res) {
  try {
    const { error, value } =
      aiCoverLetterRewriteSchema.validate(
        req.body || {},
        {
          abortEarly: true,
          stripUnknown: true,
        }
      );

    if (error) {
      return validationError(res, error);
    }

    const suggestion =
      await rewriteCoverLetterStyle(value);

    return res.json({
      suggestion,
    });
  } catch (err) {
    console.error(
      'aiCoverLetterRewrite error:',
      err
    );

    return res.status(500).json({
      error: 'Failed to rewrite cover letter',
    });
  }
}

/**
 * POST /api/.../cover-letter/improve-paragraph
 *
 * Improve a single cover-letter paragraph.
 */
export async function aiCoverLetterImproveParagraph(
  req,
  res
) {
  try {
    const { error, value } =
      aiCoverLetterParagraphSchema.validate(
        req.body || {},
        {
          abortEarly: true,
          stripUnknown: true,
        }
      );

    if (error) {
      return validationError(res, error);
    }

    const suggestion =
      await improveCoverLetterParagraph(value);

    return res.json({
      suggestion,
    });
  } catch (err) {
    console.error(
      'aiCoverLetterImproveParagraph error:',
      err
    );

    return res.status(500).json({
      error: 'Failed to improve paragraph',
    });
  }
}

/**
 * POST /api/.../cover-letter/subject
 *
 * Generate professional email/application subject lines.
 */
export async function aiCoverLetterSubject(
  req,
  res
) {
  try {
    const { error, value } =
      aiCoverLetterSubjectSchema.validate(
        req.body || {},
        {
          abortEarly: true,
          stripUnknown: true,
        }
      );

    if (error) {
      return validationError(res, error);
    }

    const suggestions =
      await suggestCoverLetterSubjectLines(value);

    return res.json({
      suggestions,
    });
  } catch (err) {
    console.error(
      'aiCoverLetterSubject error:',
      err
    );

    return res.status(500).json({
      error: 'Failed to suggest subject lines',
    });
  }
}

/**
 * POST /api/.../cover-letter/greeting-closing
 *
 * Generate greeting and closing options.
 */
export async function aiCoverLetterGreetingClosing(
  req,
  res
) {
  try {
    const { error, value } =
      aiCoverLetterGreetingClosingSchema.validate(
        req.body || {},
        {
          abortEarly: true,
          stripUnknown: true,
        }
      );

    if (error) {
      return validationError(res, error);
    }

    const suggestions =
      await suggestCoverLetterGreetingClosing(
        value
      );

    return res.json({
      suggestions,
    });
  } catch (err) {
    console.error(
      'aiCoverLetterGreetingClosing error:',
      err
    );

    return res.status(500).json({
      error:
        'Failed to suggest greetings and closings',
    });
  }
}