import fs from 'node:fs';
import {
  normalizeCvDraft,
  renderersById,
  templateMarkersById,
} from '../../../packages/shared/cv/renderers/index.js';

const SIDEBAR_TEMPLATE_IDS = new Set(['modern-sidebar', 'modern-sidebar-blue']);

function applySidebarPagedBackgroundCss(templateId) {
  if (!SIDEBAR_TEMPLATE_IDS.has(String(templateId || '').trim())) return '';

  return `
<style id="cv-sidebar-paged-background">
body[data-template-id="${templateId}"]{
  --cv-page-height:269mm;     /* A4 content height used for repeat */
  --cv-sidebar-width:70mm;
}

/* ✅ PRINT: paint on html/body so it repeats cleanly for every page slice */
@media print{
  html,body{
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    /* paginationCss uses background:#fff !important in base template CSS.
       Force the repeating sidebar layer to win in print/export. */
    background-image: linear-gradient(
      to right,
      var(--sidebarBg) 0 var(--cv-sidebar-width),
      #fff var(--cv-sidebar-width) 100%
    ) !important;
    background-repeat: repeat-y !important;
    background-size: 100% var(--cv-page-height) !important;
    background-position: top left !important;
  }

  /* ✅ prevent template .page background (often light gray) from showing */
  body[data-template-id="${templateId}"] .page{
    background: transparent !important;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
}

/* avoid double painting from aside */
body[data-template-id="${templateId}"] aside{background:transparent !important}
</style>`;
}

function withExportEnhancements(html, templateId) {
  let next = html;
  if (!next.includes('data-template-id=')) {
    next = next.replace('<body', `<body data-template-id="${templateId}"`);
  }

  const sidebarCss = applySidebarPagedBackgroundCss(templateId);
  if (sidebarCss && !next.includes('id="cv-sidebar-paged-background"')) {
    next = next.replace('</head>', `${sidebarCss}</head>`);
  }

  return next;
}

function assertTemplateMarkers(templateId, html) {
  const baseChecks = [
    ['<style>', html.includes('<style')],
    [
      'a4-size',
      html.includes('@page{size:A4') ||
        html.includes('@page { size: A4') ||
        html.includes('width:210mm'),
    ],
    [
      `data-template-id=${templateId}`,
      html.includes(`data-template-id="${templateId}"`),
    ],
  ];

  const templateChecks = (templateMarkersById[templateId] || []).map(
    (marker) => [marker, html.includes(marker)],
  );
  const checks = [...baseChecks, ...templateChecks];

  const missing = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) {
    throw new Error(
      `Export HTML does not match template renderer for templateId=${templateId || 'unknown'}; missing marker ${missing.join(', ')}`,
    );
  }
}

export function buildCvHtml({ draft }) {
  const normalized = normalizeCvDraft(draft || {});
  const templateId = normalized.templateId || normalized.template_key;
  const renderer = renderersById[templateId];
  if (!renderer) {
    throw new Error(
      `No HTML renderer registered for templateId=${templateId || 'unknown'}`,
    );
  }

  const html = withExportEnhancements(renderer(normalized), templateId);
  console.info('[exportCv] rendererId=', templateId);
  console.info('[exportCv] htmlHead=', html.slice(0, 200));
  console.info('[exportCv] htmlLength=', html.length);
  console.info('[exportCv] theme=', {
    primary: normalized.templateTheme?.primary,
    sidebarBg: normalized.templateTheme?.sidebarBg,
    headerBg: normalized.templateTheme?.headerBg,
  });
  assertTemplateMarkers(templateId, html);
  return html;
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
      process.env.CHROME_PATH ||
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    if (process.platform === 'win32' && !fs.existsSync(systemChrome)) {
      throw new Error(
        `System Chrome not found at ${systemChrome}. Install Chrome or set CHROME_PATH env var.`,
      );
    }

    browser = await puppeteer.launch({
      headless: true,
      executablePath: systemChrome,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    if (typeof page.emulateMediaType === 'function')
      await page.emulateMediaType('print');

    await page.setContent(html, { waitUntil: 'networkidle0' });
    return assertPdf(
      await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      }),
    );
  };

  const tryPlaywright = async (useChromeChannel = false) => {
    const playwright = await import('playwright');
    console.info(
      'exportPdf engine=playwright',
      useChromeChannel ? 'channel=chrome' : 'channel=bundled',
    );

    browser = await playwright.chromium.launch({
      headless: true,
      ...(useChromeChannel ? { channel: 'chrome' } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    if (typeof page.emulateMedia === 'function')
      await page.emulateMedia({ media: 'print' });

    await page.setContent(html, { waitUntil: 'networkidle' });
    return assertPdf(
      await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      }),
    );
  };

  try {
    if (process.platform === 'win32') {
      try {
        return await tryPuppeteer();
      } catch (e) {
        console.warn(
          '[exportPdf] puppeteer failed on win32; trying playwright chrome channel',
          e?.message || e,
        );
      }
      try {
        return await tryPlaywright(true);
      } catch (e) {
        console.warn(
          '[exportPdf] playwright chrome channel failed; trying bundled chromium',
          e?.message || e,
        );
      }
      return await tryPlaywright(false);
    }

    try {
      return await tryPlaywright(false);
    } catch (e) {
      console.warn(
        '[exportPdf] playwright failed; trying puppeteer',
        e?.message || e,
      );
      return await tryPuppeteer();
    }
  } catch (error) {
    throw new Error(`HTML→PDF rendering failed: ${error?.message || error}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
