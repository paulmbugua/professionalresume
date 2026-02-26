import fs from 'node:fs';

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
  'modern-sidebar': {
    primary: '#0f172a',
    sidebarBg: '#0f172a',
    sidebarText: '#f8fafc',
    accent: '#38bdf8',
  },
  'bold-header': {
    primary: '#0f172a',
    headerBg: '#0f172a',
    headerText: '#ffffff',
    accent: '#38bdf8',
  },
  'modern-teal': {
    primary: '#0f766e',
    accent: '#0d9488',
    sectionBg: '#f0fdfa',
  },
  'modern-sidebar-blue': {
    primary: '#1d4ed8',
    sidebarBg: '#1d4ed8',
    sidebarText: '#eff6ff',
    accent: '#93c5fd',
  },
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

  return cleaned.replace(
    /<\/?([a-z0-9-]+)([^>]*)>/gi,
    (full, rawTag, rawAttrs) => {
      const tag = String(rawTag || '').toLowerCase();
      if (!['b', 'strong', 'i', 'em', 'u', 'span', 'br'].includes(tag))
        return '';
      if (full.startsWith('</')) return `</${tag}>`;
      if (tag === 'br') return '<br>';
      if (tag === 'span') {
        const styleMatch = String(rawAttrs || '').match(
          /style\s*=\s*['\"]([^'\"]*)['\"]/i,
        );
        const colorMatch = styleMatch?.[1]?.match(/color\s*:\s*([^;]+)/i);
        const color = colorMatch?.[1]?.trim();
        if (!color || !HEX_COLOR_RE.test(color)) return '<span>';
        return `<span style="color:${color}">`;
      }
      return `<${tag}>`;
    },
  );
}

function normalizeDraft(draft = {}) {
  const templateDefaults = templateThemeDefaults[draft.templateId] || {};
  return {
    ...draft,
    sectionOrder: draft.sectionOrder?.length
      ? draft.sectionOrder
      : defaultSectionOrder,
    sectionVisibility: {
      ...defaultSectionVisibility,
      ...(draft.sectionVisibility || {}),
    },
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

function buildCssVarBlock(d) {
  return `:root{--baseFontSize:${d.typography.baseFontSize}px;--h1Size:${d.typography.h1Size}px;--h2Size:${d.typography.h2Size}px;--h3Size:${d.typography.h3Size || 11}px;--bodySize:${d.typography.bodySize || d.typography.baseFontSize}px;--fontFamily:${d.typography.fontFamily};--textColor:${d.formatting.textColor};--mutedTextColor:${d.formatting.mutedTextColor};--linkColor:${d.formatting.linkColor};--primary:${d.templateTheme.primary || '#0f172a'};--secondary:${d.templateTheme.secondary || '#1e293b'};--accent:${d.templateTheme.accent || d.templateTheme.primary || '#0f766e'};--sidebarBg:${d.templateTheme.sidebarBg || d.templateTheme.primary || '#0f172a'};--sidebarText:${d.templateTheme.sidebarText || '#f8fafc'};--headerBg:${d.templateTheme.headerBg || d.templateTheme.primary || '#0f172a'};--headerText:${d.templateTheme.headerText || '#ffffff'};--sectionBg:${d.templateTheme.sectionBg || '#f8fafc'};--borderColor:${d.templateTheme.borderColor || '#e2e8f0'}}`;
}

function renderSections(d, rt) {
  const sectionMap = {
    summary:
      sectionVisible(d, 'summary') &&
      (d.summary?.trim() || d.richText?.summary?.trim())
        ? `<section><h2>Summary</h2><p>${rt('summary', d.summary || '')}</p></section>`
        : '',
    skills:
      sectionVisible(d, 'skills') && d.skills?.length
        ? `<section><h2>Skills</h2><p>${esc(d.skills.join(' • '))}</p></section>`
        : '',
    experience:
      sectionVisible(d, 'experience') && d.experience?.length
        ? `<section><h2>Experience</h2>${d.experience
            .map(
              (e) =>
                `<article><h3>${esc(e.role || '')} ${e.company ? `· ${esc(e.company)}` : ''}</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}</p>${e.location ? `<p class="muted">${esc(e.location)}</p>` : ''}${
                  (e.bullets || []).length
                    ? `<ul>${e.bullets
                        .filter(Boolean)
                        .map((b) => `<li>${esc(b)}</li>`)
                        .join('')}</ul>`
                    : ''
                }</article>`,
            )
            .join('')}</section>`
        : '',
    education:
      sectionVisible(d, 'education') && d.education?.length
        ? `<section><h2>Education</h2>${d.education
            .map(
              (e) =>
                `<article><h3>${esc(e.program || '')} ${e.school ? `· ${esc(e.school)}` : ''}</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}</p>${e.details ? `<p>${esc(e.details)}</p>` : ''}</article>`,
            )
            .join('')}</section>`
        : '',
    projects:
      sectionVisible(d, 'projects') && d.projects?.length
        ? `<section><h2>Projects</h2>${d.projects
            .map(
              (p) =>
                `<article><h3>${esc(p.name || '')}</h3>${p.link ? `<p><a href="#">${esc(p.link)}</a></p>` : ''}${p.description ? `<p>${esc(p.description)}</p>` : ''}${
                  (p.bullets || []).length
                    ? `<ul>${p.bullets
                        .filter(Boolean)
                        .map((b) => `<li>${esc(b)}</li>`)
                        .join('')}</ul>`
                    : ''
                }</article>`,
            )
            .join('')}</section>`
        : '',
    certifications:
      sectionVisible(d, 'certifications') && d.certifications?.length
        ? `<section><h2>Certifications</h2>${d.certifications
            .map(
              (c) =>
                `<article><h3>${esc(c.name || '')}</h3><p class="muted">${esc([c.issuer, c.year].filter(Boolean).join(' • '))}</p></article>`,
            )
            .join('')}</section>`
        : '',
    extras:
      sectionVisible(d, 'extras') &&
      (d.extras?.languages?.length || d.extras?.interests?.length)
        ? `<section><h2>Extras</h2>${d.extras?.languages?.length ? `<p><strong>Languages:</strong> ${esc(d.extras.languages.join(', '))}</p>` : ''}${d.extras?.interests?.length ? `<p><strong>Interests:</strong> ${esc(d.extras.interests.join(', '))}</p>` : ''}</section>`
        : '',
  };

  return (d.sectionOrder || defaultSectionOrder)
    .map((sectionKey) => sectionMap[sectionKey] || '')
    .filter(Boolean)
    .join('');
}

function renderTemplateBody(d, sectionsHtml) {
  const header = `<header><h1>${esc(d.basics.name || d.title || 'Untitled CV')}</h1>${d.basics.headline ? `<p class="muted">${esc(d.basics.headline)}</p>` : ''}<p class="muted">${esc([d.basics.email, d.basics.phone, d.basics.location].filter(Boolean).join(' • '))}</p></header>`;

  if (
    d.templateId === 'modern-sidebar' ||
    d.templateId === 'modern-sidebar-blue'
  ) {
    return `<main class="page page--sidebar"><aside>${header}</aside><section class="content">${sectionsHtml}</section></main>`;
  }

  if (d.templateId === 'bold-header') {
    return `<main class="page page--bold">${header}<section class="content">${sectionsHtml}</section></main>`;
  }

  return `<main class="page">${header}${sectionsHtml}</main>`;
}

function buildSharedPaginationCss() {
  return `
@page{size:A4;margin:14mm}
*{box-sizing:border-box}
section,.item,.row,header,article{break-inside:avoid;page-break-inside:avoid}
h2,h3{break-after:avoid;page-break-after:avoid}
ul{break-inside:auto;page-break-inside:auto}
li{break-inside:avoid;page-break-inside:avoid}
body{margin:0;background:#f1f5f9;color:var(--textColor);font-family:var(--fontFamily);font-size:var(--bodySize)}
.page{width:210mm;min-height:297mm;margin:18px auto;background:#fff;padding:16mm;box-shadow:0 12px 35px rgba(2,6,23,.10);overflow:visible}
.page--bold>header{background:var(--headerBg);color:var(--headerText);margin:-16mm -16mm 12mm;padding:16mm}
.page--sidebar{display:grid;grid-template-columns:70mm 1fr;padding:0;min-height:297mm;background:linear-gradient(to right,var(--sidebarBg) 0 70mm,#fff 70mm 100%)}
.page--sidebar aside{background:transparent;color:var(--sidebarText);padding:14mm}
.page--sidebar .content{padding:16mm}
header{border-bottom:1px solid var(--borderColor);padding-bottom:8mm}
h1{font-size:var(--h1Size);margin:0}
h2{font-size:var(--h2Size);text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin:16px 0 8px}
h3{margin:0 0 4px;font-size:var(--h3Size)}
p{margin:0 0 6px;line-height:1.5}
.muted{color:var(--mutedTextColor)}
a{color:var(--linkColor)}
ul{margin:6px 0 0;padding-left:18px}
li{margin:4px 0}
section{margin-bottom:10px}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto;overflow:visible}}
`;
}

export function buildCvHtml({ draft }) {
  const d = normalizeDraft(draft || {});
  const rt = (key, fallback = '') =>
    d.richText?.[key]?.trim()
      ? sanitizeRichTextHtml(d.richText[key])
      : esc(fallback);

  const sections = renderSections(d, rt);
  const cssVars = buildCssVarBlock(d);

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${cssVars}${buildSharedPaginationCss()}</style></head><body data-template-id="${esc(d.templateId || '')}">${renderTemplateBody(d, sections)}</body></html>`;
}

export async function htmlToPdfBuffer(html) {
  let browser = null;

  const assertPdf = (pdfBuffer) => {
    if (!pdfBuffer || pdfBuffer.length < 30000) {
      throw new Error('PDF buffer too small; HTML→PDF likely failed');
    }
    console.info('exportPdf pdfBytes=', pdfBuffer.length);
    return pdfBuffer;
  };

  const tryPuppeteer = async () => {
    const puppeteer = await import('puppeteer');
    console.info('exportPdf engine=puppeteer');

    const systemChrome =
      'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe';

    if (!fs.existsSync(systemChrome)) {
      throw new Error(
        `System Chrome not found at ${systemChrome}. Install Chrome or set CHROME_PATH env var.`
      );
    }

    browser = await puppeteer.launch({
      headless: true,
      executablePath: systemChrome, // ✅ use system Chrome
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    if (typeof page.emulateMediaType === 'function') await page.emulateMediaType('print');

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    return assertPdf(pdfBuffer);
  };

  const tryPlaywright = async () => {
    const playwright = await import('playwright');
    console.info('exportPdf engine=playwright');

    browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    if (typeof page.emulateMedia === 'function') await page.emulateMedia({ media: 'print' });

    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    return assertPdf(pdfBuffer);
  };

  try {
    if (process.platform === 'win32') {
      // ✅ Windows: Puppeteer + system Chrome first (stable)
      try {
        return await tryPuppeteer();
      } catch (e) {
        console.warn('[exportPdf] puppeteer failed on win32, trying playwright...', e?.message || e);
        return await tryPlaywright();
      }
    }

    // Non-Windows: Playwright first
    try {
      return await tryPlaywright();
    } catch (e) {
      console.warn('[exportPdf] playwright failed, trying puppeteer...', e?.message || e);
      return await tryPuppeteer();
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}