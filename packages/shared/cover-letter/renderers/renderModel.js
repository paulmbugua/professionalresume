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
  const content = draft.content || {};
  const style = draft.style || {};
  const design = draft.design || {};

  const paragraphs = normalizeParagraphs(
    body.middleParagraphs || content.body || content.paragraphs || draft.letterBody,
  );

  return {
    templateId: normalizeCoverLetterTemplateId(draft.templateId || draft.templateKey),
    content: {
      applicantName: asString(
        sender.fullName || basics.fullName || basics.name || draft.applicantName || draft.senderName,
      ).trim(),
      applicantHeadline: asString(sender.headline || basics.headline || draft.senderTitle).trim(),
      applicantEmail: asString(sender.email || basics.email || draft.applicantEmail || draft.senderEmail).trim(),
      applicantPhone: asString(sender.phone || basics.phone || draft.applicantPhone || draft.senderPhone).trim(),
      applicantLocation: asString(
        sender.location || basics.location || draft.applicantLocation || draft.senderLocation,
      ).trim(),
      recipientName: asString(
        recipient.name || basics.hiringManager || draft.recipientName,
      ).trim(),
      recipientTitle: asString(recipient.title || draft.recipientTitle).trim(),
      companyName: asString(recipient.company || basics.companyName || draft.companyName).trim(),
      companyAddress: asString(
        recipient.address || recipient.addressLine1 || draft.companyAddress,
      ).trim(),
      roleTitle: asString(letter.role || basics.jobTitle || draft.roleTitle).trim(),
      date: asString(letter.date || basics.date || draft.date).trim(),
      subject: asString(letter.subject || content.subject || draft.subject).trim(),
      greeting: asString(letter.greeting || content.greeting || draft.greeting).trim() || 'Dear Hiring Manager,',
      opening: asString(body.opening || content.opening).trim(),
      paragraphs,
      closingParagraph: asString(body.closing || content.closing).trim(),
      closingLine: asString(letter.signoff || content.signature || draft.closingLine || draft.closing).trim() || 'Sincerely,',
      signatureName: asString(
        sender.fullName || basics.fullName || draft.applicantName || draft.signatureName,
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
}

export function toCoverLetterExportJson(draft = {}) {
  const model = normalizeCoverLetterRenderModel(draft);
  return {
    templateId: model.templateId,
    ...model.content,
    style: model.style,
  };
}

export const DEFAULT_COVER_LETTER_STYLE = DEFAULT_STYLE;
