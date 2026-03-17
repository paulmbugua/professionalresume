function cleanStr(value = '', max = 2000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function dedupeStrings(values = [], max = 12) {
  const seen = new Set();
  const out = [];

  for (const value of values || []) {
    const v = cleanStr(value, 260);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }

  return out;
}

export async function improveExperienceWithAi({ experience = {}, wholeCvContext = {} }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing.');
  }

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      description: { type: 'string' },
      bullets: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['description', 'bullets'],
  };

  const { openai } = await import('./aiCourseCore.js');

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'improve_experience_entry',
        schema,
        strict: true,
      },
    },
    messages: [
      {
        role: 'system',
        content:
          'You improve resume experience entries. Keep all facts grounded in the provided text only. Do not invent metrics, tools, employers, dates, achievements, or responsibilities. Return a short description of 1-2 lines max, and 3-8 strong ATS-friendly bullet points. Duties and responsibilities belong in bullets, not in description. If the input is already strong, lightly polish it. Use concise action-oriented bullets.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          summary: cleanStr(wholeCvContext.summary || '', 1200),
          skills: Array.isArray(wholeCvContext.skills) ? wholeCvContext.skills.slice(0, 40) : [],
          experience: {
            company: cleanStr(experience.company || '', 180),
            role: cleanStr(experience.role || '', 180),
            start: cleanStr(experience.start || '', 40),
            end: cleanStr(experience.end || '', 40),
            location: cleanStr(experience.location || '', 120),
            description: cleanStr(experience.description || '', 1200),
            bullets: dedupeStrings(experience.bullets || [], 12),
          },
        }),
      },
    ],
  });

  const content = completion?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(content);

  return {
    description: cleanStr(parsed.description || '', 500),
    bullets: dedupeStrings(parsed.bullets || [], 12),
  };
}