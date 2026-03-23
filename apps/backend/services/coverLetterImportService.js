import { openai } from './aiCourseCore.js';
import {
  extractTextFromUploadedDocument,
  parseCvFileToDraftPartial,
} from './cvParseService.js';

function clampText(value = '', max = 4000) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, max);
}

function toJsonSafe(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sanitizeImportData(input = {}) {
  return {
    applicantName: clampText(input.applicantName, 120),
    applicantTitle: clampText(input.applicantTitle, 140),
    applicantEmail: clampText(input.applicantEmail, 160),
    applicantPhone: clampText(input.applicantPhone, 40),
    applicantLocation: clampText(input.applicantLocation, 120),
    recipientName: clampText(input.recipientName, 120),
    recipientTitle: clampText(input.recipientTitle, 120),
    companyName: clampText(input.companyName, 140),
    companyAddress: clampText(input.companyAddress, 400),
    roleTitle: clampText(input.roleTitle, 140),
    subjectLine: clampText(input.subjectLine, 200),
    greeting: clampText(input.greeting, 5000),
    letterBody: clampText(input.letterBody, 12000),
    closingParagraph: clampText(input.closingParagraph, 5000),
    closingLine: clampText(input.closingLine, 200),
    signatureName: clampText(input.signatureName, 120),
    dateText: clampText(input.dateText, 100),
  };
}

function buildHeuristicDataFromResume(extracted = {}) {
  const basics = extracted?.basics || {};
  const firstRole = extracted?.experience?.[0]?.role || '';
  const topSkills = Array.isArray(extracted?.skills) ? extracted.skills.slice(0, 6) : [];
  const highlights = Array.isArray(extracted?.experience)
    ? extracted.experience
        .flatMap((item) => item?.bullets || [])
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const intro =
    extracted?.summary ||
    (topSkills.length
      ? `My background includes ${topSkills.join(', ')} with a track record of delivering results.`
      : '');

  const bodyPieces = [intro, ...highlights].filter(Boolean);

  return sanitizeImportData({
    applicantName: basics.name || '',
    applicantTitle: basics.headline || firstRole || '',
    applicantEmail: basics.email || '',
    applicantPhone: basics.phone || '',
    applicantLocation: basics.location || '',
    greeting: 'Dear Hiring Manager,',
    letterBody: bodyPieces.join('\n\n'),
    closingLine: 'Sincerely,',
    signatureName: basics.name || '',
  });
}

async function aiMapResumeToCoverLetterData({ extracted, text }) {
  const system = [
    'You map resume data into a starter cover-letter form.',
    'Return strict JSON only using keys:',
    'applicantName, applicantTitle, applicantEmail, applicantPhone, applicantLocation,',
    'recipientName, recipientTitle, companyName, companyAddress, roleTitle,',
    'subjectLine, greeting, letterBody, closingParagraph, closingLine, signatureName, dateText.',
    'Use only facts present in input. Do not hallucinate company or recipient.',
    'Make letterBody persuasive and concise (2-4 short paragraphs).',
  ].join(' ');

  const user = `Resume structured extraction:\n${JSON.stringify(extracted || {}, null, 2)}\n\nResume text excerpt:\n${clampText(text, 8000)}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion?.choices?.[0]?.message?.content || '';
  const parsed = toJsonSafe(raw);
  return parsed ? sanitizeImportData(parsed) : null;
}

async function aiMapCoverLetterTextToData(text = '') {
  const system = [
    'Extract structured fields from a cover letter text.',
    'Return strict JSON only with keys:',
    'applicantName, applicantTitle, applicantEmail, applicantPhone, applicantLocation,',
    'recipientName, recipientTitle, companyName, companyAddress, roleTitle,',
    'subjectLine, greeting, letterBody, closingParagraph, closingLine, signatureName, dateText.',
    'If unknown, return empty string.',
  ].join(' ');

  const user = `Cover letter text:\n${clampText(text, 10000)}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  const raw = completion?.choices?.[0]?.message?.content || '';
  const parsed = toJsonSafe(raw);
  return parsed ? sanitizeImportData(parsed) : null;
}

export async function importDocumentToCoverLetterData({
  sourceType,
  buffer,
  mimetype,
  filename,
}) {
  if (sourceType === 'resume') {
    const parsed = await parseCvFileToDraftPartial({ buffer, mimetype, filename });
    const extracted = parsed?.extracted || {};
    let aiData = null;
    try {
      const textExtraction = await extractTextFromUploadedDocument({ buffer, mimetype, filename });
      aiData = await aiMapResumeToCoverLetterData({
        extracted,
        text: textExtraction?.text || '',
      });
    } catch {
      aiData = null;
    }

    return {
      data: aiData || buildHeuristicDataFromResume(extracted),
      diagnostics: {
        ...(parsed?.diagnostics || {}),
        sourceType: 'resume',
        usedAiRefinement: Boolean(aiData),
      },
    };
  }

  const extractedText = await extractTextFromUploadedDocument({ buffer, mimetype, filename });
  if (!extractedText?.text?.trim()) {
    throw new Error('Could not extract readable text from the uploaded file.');
  }

  let aiData = null;
  try {
    aiData = await aiMapCoverLetterTextToData(extractedText.text);
  } catch {
    aiData = null;
  }

  return {
    data: sanitizeImportData(
      aiData || {
        greeting: 'Dear Hiring Manager,',
        letterBody: clampText(extractedText.text, 12000),
        closingLine: 'Sincerely,',
      }
    ),
    diagnostics: {
      ...(extractedText.diagnostics || {}),
      sourceType: 'cover_letter',
      usedAiRefinement: Boolean(aiData),
    },
  };
}
