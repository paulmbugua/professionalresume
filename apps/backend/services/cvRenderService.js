import PDFDocument from 'pdfkit';

const defaultSectionOrder = [
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'extras',
];

const defaultSectionVisibility = defaultSectionOrder.reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, {});

const templateThemeDefaults = {
  'modern-sidebar': { primary: '#0f172a', sidebarBg: '#0f172a', sidebarText: '#f8fafc', accent: '#38bdf8' },
  'bold-header': { primary: '#0f172a', headerBg: '#0f172a', headerText: '#ffffff', accent: '#38bdf8' },
  'modern-teal': { primary: '#0f766e', accent: '#0d9488', sectionBg: '#f0fdfa' },
  'modern-sidebar-blue': { primary: '#1d4ed8', sidebarBg: '#1d4ed8', sidebarText: '#eff6ff', accent: '#93c5fd' },
};

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const esc = (v = '') =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function sanitizeRichTextHtml(input = '') {
  const cleaned = String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  return cleaned.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (full, rawTag, rawAttrs) => {
    const tag = String(rawTag || '').toLowerCase();
    if (!['b', 'strong', 'i', 'em', 'u', 'span', 'br'].includes(tag)) return '';
    if (full.startsWith('</')) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'span') {
      const styleMatch = String(rawAttrs || '').match(/style\s*=\s*['\"]([^'\"]*)['\"]/i);
      const colorMatch = styleMatch?.[1]?.match(/color\s*:\s*([^;]+)/i);
      const color = colorMatch?.[1]?.trim();
      if (!color || !HEX_COLOR_RE.test(color)) return '<span>';
      return `<span style="color:${color}">`;
    }
    return `<${tag}>`;
  });
}

function normalizeDraft(draft = {}) {
  const templateDefaults = templateThemeDefaults[draft.templateId] || {};
  return {
    ...draft,
    sectionOrder: draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder,
    sectionVisibility: { ...defaultSectionVisibility, ...(draft.sectionVisibility || {}) },
    basics: {
      ...(draft.basics || {}),
      name: draft.basics?.name || '',
      headline: draft.basics?.headline || '',
      email: draft.basics?.email || '',
      phone: draft.basics?.phone || '',
      location: draft.basics?.location || '',
      links: draft.basics?.links || [],
    },
    summary: draft.summary || '',
    skills: draft.skills || [],
    experience: draft.experience || [],
    education: draft.education || [],
    projects: draft.projects || [],
    certifications: draft.certifications || [],
    extras: { languages: [], interests: [], ...(draft.extras || {}) },
    typography: {
      baseFontSize: 12,
      h1Size: 28,
      h2Size: 12,
      h3Size: 11,
      bodySize: 11,
      fontFamily: 'Inter, system-ui, Arial',
      ...(draft.typography || {}),
    },
    formatting: {
      textColor: '#0f172a',
      mutedTextColor: '#475569',
      linkColor: '#0f766e',
      ...(draft.formatting || {}),
    },
    templateTheme: {
      primary: '#0f172a',
      ...templateDefaults,
      ...(draft.templateTheme || {}),
    },
    richText: {
      ...(draft.richText || {}),
    },
  };
}

function sectionVisible(draft, key) {
  return draft.sectionVisibility?.[key] !== false;
}

export function buildCvHtml({ draft }) {
  const d = normalizeDraft(draft || {});
  const rt = (key, fallback = '') => (d.richText?.[key]?.trim() ? sanitizeRichTextHtml(d.richText[key]) : esc(fallback));

  const cssVars = `
:root {
  --baseFontSize:${d.typography.baseFontSize}px;
  --h1Size:${d.typography.h1Size}px;
  --h2Size:${d.typography.h2Size}px;
  --bodySize:${d.typography.bodySize || d.typography.baseFontSize}px;
  --fontFamily:${d.typography.fontFamily};
  --textColor:${d.formatting.textColor};
  --mutedTextColor:${d.formatting.mutedTextColor};
  --linkColor:${d.formatting.linkColor};
  --primary:${d.templateTheme.primary || '#0f172a'};
  --accent:${d.templateTheme.accent || d.templateTheme.primary || '#0f766e'};
  --sidebarBg:${d.templateTheme.sidebarBg || d.templateTheme.primary || '#0f172a'};
  --sidebarText:${d.templateTheme.sidebarText || '#f8fafc'};
  --headerBg:${d.templateTheme.headerBg || d.templateTheme.primary || '#0f172a'};
  --headerText:${d.templateTheme.headerText || '#ffffff'};
}
`;

  const sections = [];
  if (sectionVisible(d, 'summary') && (d.summary?.trim() || d.richText?.summary?.trim())) {
    sections.push(`<section><h2>Summary</h2><p>${rt('summary', d.summary || '')}</p></section>`);
  }
  if (sectionVisible(d, 'skills') && d.skills?.length) {
    sections.push(`<section><h2>Skills</h2><p>${esc(d.skills.join(' • '))}</p></section>`);
  }
  if (sectionVisible(d, 'experience') && d.experience?.length) {
    sections.push(`<section><h2>Experience</h2>${d.experience.map((e) => `<article><h3>${esc(e.role || '')} ${e.company ? `· ${esc(e.company)}` : ''}</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}</p>${e.location ? `<p class="muted">${esc(e.location)}</p>` : ''}${(e.bullets || []).length ? `<ul>${e.bullets.filter(Boolean).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}</article>`).join('')}</section>`);
  }
  if (sectionVisible(d, 'education') && d.education?.length) {
    sections.push(`<section><h2>Education</h2>${d.education.map((e) => `<article><h3>${esc(e.program || '')} ${e.school ? `· ${esc(e.school)}` : ''}</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}</p>${e.details ? `<p>${esc(e.details)}</p>` : ''}</article>`).join('')}</section>`);
  }
  if (sectionVisible(d, 'projects') && d.projects?.length) {
    sections.push(`<section><h2>Projects</h2>${d.projects.map((p) => `<article><h3>${esc(p.name || '')}</h3>${p.link ? `<p><a href="#">${esc(p.link)}</a></p>` : ''}${p.description ? `<p>${esc(p.description)}</p>` : ''}${(p.bullets || []).length ? `<ul>${p.bullets.filter(Boolean).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}</article>`).join('')}</section>`);
  }
  if (sectionVisible(d, 'certifications') && d.certifications?.length) {
    sections.push(`<section><h2>Certifications</h2>${d.certifications.map((c) => `<article><h3>${esc(c.name || '')}</h3><p class="muted">${esc([c.issuer, c.year].filter(Boolean).join(' • '))}</p></article>`).join('')}</section>`);
  }
  if (sectionVisible(d, 'extras') && (d.extras?.languages?.length || d.extras?.interests?.length)) {
    sections.push(`<section><h2>Extras</h2>${d.extras?.languages?.length ? `<p><strong>Languages:</strong> ${esc(d.extras.languages.join(', '))}</p>` : ''}${d.extras?.interests?.length ? `<p><strong>Interests:</strong> ${esc(d.extras.interests.join(', '))}</p>` : ''}</section>`);
  }

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>
${cssVars}
*{box-sizing:border-box} body{margin:0;background:#f1f5f9;color:var(--textColor);font-family:var(--fontFamily)}
.page{width:210mm;min-height:297mm;margin:18px auto;background:#fff;padding:16mm;box-shadow:0 12px 35px rgba(2,6,23,.10);font-size:var(--bodySize)}
header{${d.templateId === 'bold-header' ? 'background:var(--headerBg);color:var(--headerText);margin:-16mm -16mm 12mm;padding:16mm;' : 'border-bottom:1px solid #e2e8f0;padding-bottom:8mm;'}}
h1{font-size:var(--h1Size);margin:0} h2{font-size:var(--h2Size);text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin:16px 0 8px}
h3{margin:0 0 4px} p{margin:0 0 6px;line-height:1.5} .muted{color:var(--mutedTextColor)} a{color:var(--linkColor)}
ul{margin:6px 0 0;padding-left:18px} li{margin:4px 0}
@page{size:A4;margin:12mm} @media print{body{background:#fff}.page{margin:0;box-shadow:none}}
</style></head><body><main class="page"><header><h1>${esc(d.basics.name || d.title || 'Untitled CV')}</h1>${d.basics.headline ? `<p class="muted">${esc(d.basics.headline)}</p>` : ''}<p class="muted">${esc([d.basics.email, d.basics.phone, d.basics.location].filter(Boolean).join(' • '))}</p></header>${sections.join('')}</main></body></html>`;
}

export function draftToPdfBuffer(draft) {
  return new Promise((resolve, reject) => {
    const d = normalizeDraft(draft || {});
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor(d.formatting.textColor || '#0f172a').fontSize(d.typography.h1Size || 24).text(d.basics?.name || d.title || 'Untitled CV');
    if (d.basics?.headline) doc.moveDown(0.2).fillColor(d.formatting.mutedTextColor || '#475569').fontSize(d.typography.bodySize || 11).text(d.basics.headline);
    doc.moveDown(0.5).fontSize(d.typography.bodySize || 11).fillColor(d.formatting.textColor || '#0f172a');
    const meta = [d.basics?.email, d.basics?.phone, d.basics?.location].filter(Boolean).join(' • ');
    if (meta) doc.text(meta);

    if (sectionVisible(d, 'summary') && d.summary) {
      doc.moveDown().fillColor(d.templateTheme.accent || '#0f766e').fontSize(d.typography.h2Size || 12).text('SUMMARY');
      doc.fillColor(d.formatting.textColor || '#0f172a').fontSize(d.typography.bodySize || 11).text(String(d.summary).replace(/<[^>]*>/g, ''));
    }

    const write = (title, rows, toLine) => {
      if (!rows?.length) return;
      doc.moveDown().fillColor(d.templateTheme.accent || '#0f766e').fontSize(d.typography.h2Size || 12).text(title.toUpperCase());
      doc.fillColor(d.formatting.textColor || '#0f172a').fontSize(d.typography.bodySize || 11);
      rows.forEach((entry) => {
        const line = toLine(entry);
        if (line) doc.text(`• ${line}`);
      });
    };

    if (sectionVisible(d, 'experience')) write('Experience', d.experience, (e) => [e.role, e.company, [e.start, e.end].filter(Boolean).join(' - ')].filter(Boolean).join(' · '));
    if (sectionVisible(d, 'education')) write('Education', d.education, (e) => [e.program, e.school, [e.start, e.end].filter(Boolean).join(' - ')].filter(Boolean).join(' · '));
    if (sectionVisible(d, 'projects')) write('Projects', d.projects, (p) => [p.name, p.link].filter(Boolean).join(' · '));
    if (sectionVisible(d, 'skills') && d.skills?.length) write('Skills', [d.skills], (s) => s.join(', '));
    if (sectionVisible(d, 'certifications')) write('Certifications', d.certifications, (c) => [c.name, c.issuer, c.year].filter(Boolean).join(' · '));

    doc.end();
  });
}
