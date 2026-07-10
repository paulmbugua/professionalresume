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
    'You are a professional CV and resume writer for ProfessionalResume.co.ke. Prioritize Kenyan job market expectations while supporting international applications. Use ATS-friendly wording for counties, ministries, county governments, NGOs, banks, SACCOs, parastatals, UN agencies, TVETs, universities, and private-sector roles when relevant. Respond with JSON: {"suggestion": "..."}.';
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
    'You rewrite CV/resume bullets to be impact-driven, ATS-friendly, and quantified where possible. Keep facts grounded, use Kenyan or international employer language when context suggests it, and respond with JSON: {"suggestion": "..."}';
  const user = `Context: ${context}
Bullet: ${bullet}
Rewrite as a single bullet sentence (no markdown).`;
  const data = await requestJson({ system, user });
  return String(data.suggestion || '').trim();
}

export async function suggestSkills(draft) {
  const system =
    'You are a Kenya-aware resume assistant. Suggest up to 12 relevant ATS skills for Kenyan and international roles, including NGO, government, county, banking, SACCO, parastatal, UN, TVET, university, and private-sector contexts when relevant. Respond with JSON: {"suggestions": ["..."]}.';
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

export async function jobRequirementAssist({ draft, jobAdvertText, regenerate = false }) {
  const system =
    'You are a Kenya-aware CV tailoring assistant for ProfessionalResume.co.ke. Extract role targets from a job advert and produce CV-ready suggestions for Kenyan employers, NGOs, ministries, county governments, parastatals, SACCOs, banks, UN agencies, diaspora roles, and international ATS systems when relevant. Respond with JSON only.';
  const user = `Analyze this job advert and the current CV context.

Requirements:
- Return JSON with keys:
  targetRoleTitle (string)
  targetYearsExperience (string)
  keySkills (string[])
  coreResponsibilities (string[])
  preferredAchievements (string[])
  toolsAndTechnologies (string[])
  qualifications (string[])
  tailoredHeadline (string)
  tailoredSummary (string)
  tailoredExperienceSuggestions (array of objects with: entryHint, focusArea, bullets[])
- Keep arrays concise (max 8 each), highly relevant, and ATS-friendly.
- Bullets must be resume-ready, impact-oriented, realistic, and not copy-paste from advert.
- If regenerate=true, provide alternative phrasing while staying accurate.

regenerate=${regenerate ? 'true' : 'false'}

Job advert text:
${jobAdvertText}

Current CV context:
${JSON.stringify(
  {
    basics: draft?.basics,
    summary: draft?.summary,
    skills: draft?.skills,
    experience: draft?.experience,
    certifications: draft?.certifications,
    projects: draft?.projects,
  },
  null,
  2
)}`;

  const data = await requestJson({ system, user });

  const toList = (v) =>
    Array.isArray(v)
      ? v.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8)
      : [];
  const tailoredExperienceSuggestions = Array.isArray(data.tailoredExperienceSuggestions)
    ? data.tailoredExperienceSuggestions
        .map((item) => ({
          entryHint: String(item?.entryHint || '').trim(),
          focusArea: String(item?.focusArea || '').trim(),
          bullets: toList(item?.bullets),
        }))
        .filter((item) => item.entryHint || item.focusArea || item.bullets.length)
        .slice(0, 8)
    : [];

  return {
    targetRoleTitle: String(data.targetRoleTitle || '').trim(),
    targetYearsExperience: String(data.targetYearsExperience || '').trim(),
    keySkills: toList(data.keySkills),
    coreResponsibilities: toList(data.coreResponsibilities),
    preferredAchievements: toList(data.preferredAchievements),
    toolsAndTechnologies: toList(data.toolsAndTechnologies),
    qualifications: toList(data.qualifications),
    tailoredHeadline: String(data.tailoredHeadline || '').trim(),
    tailoredSummary: String(data.tailoredSummary || '').trim(),
    tailoredExperienceSuggestions,
  };
}
