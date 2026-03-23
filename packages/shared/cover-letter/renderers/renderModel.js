const LEGACY_TEMPLATE_ALIASES = {
  'classic-cover-letter': 'classic-letter',
  'modern-accent': 'clean-modern-header',
};

const LETTER_IDS = [
  'classic-letter',
  'professional-blue-letterhead',
  'clean-modern-header',
  'dark-header-corporate',
  'minimal-wide-name-header',
  'plain-re-subject',
  'simple-everyday-formal',
  'premium-elegant-business',
];

const DEFAULT_STYLE = {
  fontFamily: 'Inter, system-ui, Arial, sans-serif',
  fontSize: 12,
  lineHeight: 1.5,
  accentColor: '#1d4ed8',
  pageTheme: 'light',
};

function asString(v) {
  return typeof v === 'string' ? v : '';
}

function asNumber(v, fallback) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string') return value;
  }
  return '';
}

function normalizeParagraphs(raw) {
  if (Array.isArray(raw)) {
    return raw.map((line) => String(line || '').trim()).filter(Boolean);
  }

  return String(raw || '')
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeCoverLetterTemplateId(templateId) {
  const candidate = String(templateId || '').trim();
  const mapped = LEGACY_TEMPLATE_ALIASES[candidate] || candidate;
  return LETTER_IDS.includes(mapped) ? mapped : 'classic-letter';
}

export function normalizeCoverLetterRenderModel(draft = {}) {
  const sender = draft.sender || {};
  const recipient = draft.recipient || {};
  const letter = draft.letter || {};
  const body = draft.body || {};
  const basics = draft.basics || {};
  const legacyContent = draft.content || {};
  const style = draft.style || {};
  const design = draft.design || {};

  const paragraphSource =
    body.middleParagraphs ||
    legacyContent.paragraphs ||
    legacyContent.body ||
    draft.paragraphs ||
    draft.letterBody;
  const paragraphs = normalizeParagraphs(paragraphSource);

  const applicantName = asString(
    firstString(
      sender.fullName,
      basics.fullName,
      basics.name,
      legacyContent.applicantName,
      draft.applicantName,
      draft.senderName,
    ),
  ).trim();

  const applicantTitle = asString(
    firstString(
      sender.title,
      sender.headline,
      basics.headline,
      legacyContent.applicantTitle,
      legacyContent.applicantHeadline,
      draft.applicantTitle,
      draft.applicantHeadline,
      draft.senderTitle,
    ),
  ).trim();

  const normalized = {
    templateId: normalizeCoverLetterTemplateId(draft.templateId || draft.templateKey),
    templateKey: normalizeCoverLetterTemplateId(draft.templateKey || draft.templateId),
    content: {
      applicantName,
      applicantTitle,
      applicantHeadline: applicantTitle,
      applicantEmail: asString(
        firstString(
          sender.email,
          basics.email,
          legacyContent.applicantEmail,
          draft.applicantEmail,
          draft.senderEmail,
        ),
      ).trim(),
      applicantPhone: asString(
        firstString(
          sender.phone,
          basics.phone,
          legacyContent.applicantPhone,
          draft.applicantPhone,
          draft.senderPhone,
        ),
      ).trim(),
      applicantLocation: asString(
        firstString(
          sender.location,
          basics.location,
          legacyContent.applicantLocation,
          draft.applicantLocation,
          draft.senderLocation,
        ),
      ).trim(),
      recipientName: asString(
        firstString(
          recipient.name,
          basics.hiringManager,
          legacyContent.recipientName,
          draft.recipientName,
        ),
      ).trim(),
      recipientTitle: asString(
        firstString(recipient.title, legacyContent.recipientTitle, draft.recipientTitle),
      ).trim(),
      companyName: asString(
        firstString(
          recipient.company,
          basics.companyName,
          legacyContent.companyName,
          draft.companyName,
        ),
      ).trim(),
      companyAddress: asString(
        firstString(
          recipient.address,
          recipient.addressLine1,
          legacyContent.companyAddress,
          draft.companyAddress,
        ),
      ).trim(),
      roleTitle: asString(
        firstString(letter.role, basics.jobTitle, legacyContent.roleTitle, draft.roleTitle),
      ).trim(),
      dateText: asString(
        firstString(letter.date, basics.date, legacyContent.dateText, legacyContent.date, draft.dateText, draft.date),
      ).trim(),
      date: asString(
        firstString(letter.date, basics.date, legacyContent.dateText, legacyContent.date, draft.dateText, draft.date),
      ).trim(),
      subjectLine: asString(
        firstString(letter.subject, legacyContent.subjectLine, legacyContent.subject, draft.subjectLine, draft.subject),
      ).trim(),
      subject: asString(
        firstString(letter.subject, legacyContent.subjectLine, legacyContent.subject, draft.subjectLine, draft.subject),
      ).trim(),
      greeting: asString(
        firstString(letter.greeting, legacyContent.greeting, draft.greeting),
      ).trim() || 'Dear Hiring Manager,',
      opening: asString(firstString(body.opening, legacyContent.opening, draft.opening)).trim(),
      paragraphs,
      letterBody: paragraphs.join('\n\n'),
      closingParagraph: asString(firstString(body.closing, legacyContent.closingParagraph, legacyContent.closing, draft.closingParagraph, draft.closing)).trim(),
      closingLine: asString(
        firstString(letter.signoff, legacyContent.closingLine, legacyContent.signature, draft.closingLine, draft.closing),
      ).trim() || 'Sincerely,',
      signatureName: asString(
        firstString(
          sender.fullName,
          basics.fullName,
          legacyContent.signatureName,
          legacyContent.applicantName,
          draft.signatureName,
          draft.applicantName,
        ),
      ).trim() || 'Your Name',
    },
    style: {
      fontFamily: asString(style.fontFamily || design.fontFamily || draft.fontFamily || DEFAULT_STYLE.fontFamily),
      fontSize: asNumber(style.fontSize || design.fontSize || draft.fontSize, DEFAULT_STYLE.fontSize),
      lineHeight: asNumber(style.lineHeight || design.lineHeight || draft.lineHeight, DEFAULT_STYLE.lineHeight),
      accentColor: asString(style.accentColor || design.accentColor || draft.accentColor || DEFAULT_STYLE.accentColor),
      pageTheme: asString(style.pageTheme || design.pageTheme || draft.pageTheme || DEFAULT_STYLE.pageTheme) || 'light',
    },
  };

  return normalized;
}

export function toCoverLetterExportJson(draft = {}) {
  const model = normalizeCoverLetterRenderModel(draft);
  return {
    templateId: model.templateId,
    templateKey: model.templateKey,
    content: model.content,
    style: model.style,
    ...model.content,
  };
}

export const DEFAULT_COVER_LETTER_STYLE = DEFAULT_STYLE;
