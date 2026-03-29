import fs from 'node:fs';
import {
  normalizeCvDraft,
  renderersById as cvRenderersById,
  templateMarkersById as cvTemplateMarkersById,
} from '../../../packages/shared/cv/renderers/index.js';
import {
  renderersById as coverLetterRenderersById,
  templateMarkersById as coverLetterTemplateMarkersById,
} from '../../../packages/shared/cover-letter/renderers/index.js';

const SIDEBAR_TEMPLATE_IDS = new Set(['modern-sidebar', 'modern-sidebar-blue']);
const COVER_LETTER_TEMPLATE_IDS = new Set(Object.keys(coverLetterRenderersById));
const CONTAINER_BROWSER_ARGS = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'];
const OPTIONAL_LINUX_CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
const OPTIONAL_WINDOWS_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

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

  /* avoid double painting from aside only while printing/exporting */
  body[data-template-id="${templateId}"] aside{
    background: transparent !important;
  }
}
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

  const markerRegistry = COVER_LETTER_TEMPLATE_IDS.has(templateId)
    ? coverLetterTemplateMarkersById
    : cvTemplateMarkersById;
  const templateChecks = (markerRegistry[templateId] || []).map((marker) => [
    marker,
    html.includes(marker),
  ]);
  const checks = [...baseChecks, ...templateChecks];

  const missing = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (missing.length) {
    throw new Error(
      `Export HTML does not match template renderer for templateId=${templateId || 'unknown'}; missing marker ${missing.join(', ')}`,
    );
  }
}

export function buildCvHtml({ draft }) {
  const isCoverLetter = COVER_LETTER_TEMPLATE_IDS.has(
    String(draft?.templateId || draft?.template_key || '').trim(),
  );
  const normalized = isCoverLetter ? { ...(draft || {}) } : normalizeCvDraft(draft || {});
  const templateId = normalized.templateId || normalized.template_key;
  const rendererRegistry = isCoverLetter ? coverLetterRenderersById : cvRenderersById;
  const renderer = rendererRegistry[templateId];
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
  const platform = process.platform;

  const logEngineSelection = ({ engine, extra = {} }) => {
    console.info('[exportPdf] launch', {
      engine,
      platform,
      ...extra,
    });
  };

  const assertPdf = (pdfBuffer) => {
    if (!pdfBuffer || pdfBuffer.length < 30000) {
      throw new Error('PDF buffer too small; HTML→PDF likely failed');
    }
    console.info('exportPdf pdfBytes=', pdfBuffer.length);
    return pdfBuffer;
  };

  const resolveFallbackExecutablePath = () => {
    const candidates = [];
    if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
    if (platform === 'win32') candidates.push(...OPTIONAL_WINDOWS_CHROME_PATHS);
    if (platform === 'linux') candidates.push(...OPTIONAL_LINUX_CHROME_PATHS);

    const chosenPath = candidates.find((candidate) => fs.existsSync(candidate)) || null;
    return {
      chosenPath,
      checkedPaths: candidates,
    };
  };

  const tryPuppeteer = async () => {
    const puppeteer = await import('puppeteer');
    const { chosenPath, checkedPaths } = resolveFallbackExecutablePath();
    logEngineSelection({
      engine: 'puppeteer',
      extra: {
        fallbackExecutablePath: chosenPath || null,
        checkedFallbackPaths: checkedPaths,
      },
    });

    if (!chosenPath) {
      throw new Error(
        `No fallback Chrome/Chromium executable found for platform=${platform}. Checked: ${checkedPaths.join(', ') || 'none'}`,
      );
    }

    browser = await puppeteer.launch({
      headless: true,
      executablePath: chosenPath,
      args: CONTAINER_BROWSER_ARGS,
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

  const tryPlaywright = async () => {
    const playwright = await import('playwright');
    let bundledExecutablePath = null;
    try {
      bundledExecutablePath = playwright.chromium.executablePath();
    } catch {}
    const playwrightBrowserAvailable = Boolean(
      bundledExecutablePath && fs.existsSync(bundledExecutablePath),
    );
    logEngineSelection({
      engine: 'playwright',
      extra: {
        playwrightBrowserAvailable,
        playwrightExecutablePath: bundledExecutablePath || null,
      },
    });

    if (!playwrightBrowserAvailable) {
      throw new Error(
        `Playwright Chromium is not installed for platform=${platform}. Run: yarn playwright:install:backend`,
      );
    }

    browser = await playwright.chromium.launch({
      headless: true,
      args: [...CONTAINER_BROWSER_ARGS, '--disable-dev-shm-usage'],
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
    try {
      return await tryPlaywright(false);
    } catch (e) {
      console.warn(
        '[exportPdf] playwright failed; trying puppeteer fallback',
        e?.message || e,
      );
      return await tryPuppeteer();
    }
  } catch (error) {
    throw new Error(
      `HTML→PDF rendering failed on platform=${platform}: ${error?.message || error}. Install Playwright Chromium during build (yarn playwright:install:backend) or set CHROME_PATH to a valid Chrome/Chromium binary.`,
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}
