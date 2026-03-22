import { openai } from './aiCourseCore.js';

function parseJson(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end >= 0) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clampText(value, max = 4000) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, max);
}

function sanitizeGenerateInput(input = {}) {
  return {
    jobTitle: clampText(input.jobTitle, 180),
    company: clampText(input.company, 180),
    experience: clampText(input.experience, 3500),
    tone: clampText(input.tone, 80),
    seniority: clampText(input.seniority, 80),
  };
}

async function requestJson({ system, user }) {
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  const content = completion?.choices?.[0]?.message?.content ?? '';
  const parsed = parseJson(content);
  if (!parsed) throw new Error('Invalid AI response');
  return parsed;
}

function normalizeCoverLetter(data = {}) {
  return {
    subject: clampText(data.subject || data.subjectLine, 160),
    greeting: clampText(data.greeting, 220),
    body: clampText(data.body, 4000),
    closing: clampText(data.closing, 260),
  };
}

export async function generateCoverLetter(input) {
  const safeInput = sanitizeGenerateInput(input);
  const system = [
    'You are an expert cover-letter writer.',
    'Return valid JSON only with keys: subject, greeting, body, closing.',
    'No markdown. Keep body to 3-5 short paragraphs.',
    'Do not fabricate unverifiable facts or metrics.',
  ].join(' ');

  const user = `Generate a tailored cover letter from:
${JSON.stringify(safeInput, null, 2)}
`;
  const data = await requestJson({ system, user });
  return normalizeCoverLetter(data);
}

export async function rewriteCoverLetterStyle({ body, style }) {
  const safeBody = clampText(body, 4500);
  const safeStyle = clampText(style, 80);
  const system = [
    'You rewrite cover letters while preserving user intent and facts.',
    'Return valid JSON only: {"body":"..."}',
    'No markdown, no lists.',
  ].join(' ');
  const user = `Rewrite this cover-letter body in "${safeStyle}" style:
${JSON.stringify({ body: safeBody }, null, 2)}
`;
  const data = await requestJson({ system, user });
  return { body: clampText(data.body, 4500) };
}

export async function improveCoverLetterParagraph({ paragraph, context }) {
  const safeParagraph = clampText(paragraph, 2000);
  const safeContext = clampText(context, 2200);
  const system = [
    'You improve one paragraph in a cover letter for clarity and impact.',
    'Return valid JSON only: {"paragraph":"..."}',
    'Keep original meaning and facts.',
  ].join(' ');
  const user = `Improve this paragraph:
${JSON.stringify({ paragraph: safeParagraph, context: safeContext }, null, 2)}
`;
  const data = await requestJson({ system, user });
  return { paragraph: clampText(data.paragraph, 2000) };
}

export async function suggestCoverLetterSubjectLines({ body, jobTitle, company }) {
  const system =
    'Suggest concise subject lines. Return JSON only: {"suggestions":["..."]}. Max 8 items.';
  const user = `Suggest subject lines:
${JSON.stringify(
    {
      body: clampText(body, 1800),
      jobTitle: clampText(jobTitle, 180),
      company: clampText(company, 180),
    },
    null,
    2
  )}
`;
  const data = await requestJson({ system, user });
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.map((item) => clampText(item, 160)).filter(Boolean).slice(0, 8)
    : [];
  return suggestions;
}

export async function suggestCoverLetterGreetingClosing({ body, jobTitle, company }) {
  const system = [
    'Suggest professional greeting and closing options.',
    'Return JSON only: {"greetings":["..."],"closings":["..."]}. Max 6 each.',
  ].join(' ');
  const user = `Suggest greeting and closing options:
${JSON.stringify(
    {
      body: clampText(body, 1600),
      jobTitle: clampText(jobTitle, 180),
      company: clampText(company, 180),
    },
    null,
    2
  )}
`;
  const data = await requestJson({ system, user });
  return {
    greetings: Array.isArray(data.greetings)
      ? data.greetings.map((item) => clampText(item, 220)).filter(Boolean).slice(0, 6)
      : [],
    closings: Array.isArray(data.closings)
      ? data.closings.map((item) => clampText(item, 220)).filter(Boolean).slice(0, 6)
      : [],
  };
}
