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
  if (!parsed) {
    throw new Error('Invalid AI response');
  }
  return parsed;
}

export async function generateSummary(draft) {
  const system =
    'You are a professional resume writer. Respond with JSON: {"suggestion": "..."}.';
  const user = `Create a concise professional summary (2-3 sentences, no markdown) for this CV draft:
${JSON.stringify(
  {
    basics: draft?.basics,
    skills: draft?.skills,
    experience: draft?.experience,
    education: draft?.education,
    projects: draft?.projects,
  },
  null,
  2
)}`;
  const data = await requestJson({ system, user });
  return String(data.suggestion || '').trim();
}

export async function rewriteBullet(context, bullet) {
  const system =
    'You rewrite resume bullets to be impact-driven and quantified where possible. Respond with JSON: {"suggestion": "..."}';
  const user = `Context: ${context}
Bullet: ${bullet}
Rewrite as a single bullet sentence (no markdown).`;
  const data = await requestJson({ system, user });
  return String(data.suggestion || '').trim();
}

export async function suggestSkills(draft) {
  const system =
    'You are a resume assistant. Suggest up to 12 relevant skills. Respond with JSON: {"suggestions": ["..."]}.';
  const user = `Suggest skills for this CV draft:
${JSON.stringify(
  {
    basics: draft?.basics,
    summary: draft?.summary,
    skills: draft?.skills,
    experience: draft?.experience,
    projects: draft?.projects,
  },
  null,
  2
)}`;
  const data = await requestJson({ system, user });
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.map((item) => String(item).trim()).filter(Boolean)
    : [];
  return suggestions;
}
