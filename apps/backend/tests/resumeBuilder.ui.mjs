import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import jwt from 'jsonwebtoken';
import { collectResumeClaims } from '../services/resumeGenerationSchema.js';
import { normalizeCvDraft } from '../../../packages/shared/cv/renderers/index.js';
import { cvTemplates } from '../services/cvTemplates.js';

const baseUrl = process.env.RESUME_UI_URL || 'http://localhost:3006';
const output =
  process.env.RESUME_UI_OUTPUT ||
  path.join(process.env.TEMP || '.', 'professionalresume-ai-qa');
await fs.mkdir(output, { recursive: true });
const id = '11111111-1111-4111-8111-111111111111';
const originalDocumentId = '22222222-2222-4222-8222-222222222222';
const data = {
  basics: {
    name: 'Paul Mbugua',
    headline: 'Technical Analyst | APIs & Integrations',
    email: 'paul@example.com',
    phone: '+254700000000',
    location: 'Nairobi, Kenya',
    links: [],
  },
  targetTitle: 'Technical Analyst | APIs & Integrations',
  summary: 'Software engineer with REST API, SQL and banking experience.',
  skills: ['Node.js', 'REST APIs', 'PostgreSQL', 'Docker'],
  experience: [
    {
      company: 'EkaziConnect Solutions Ltd',
      role: 'Founder & Lead Software Engineer',
      start: '2024',
      end: 'Present',
      location: 'Nairobi',
      description: 'API engineering and integration delivery.',
      bullets: [
        'Developed REST APIs and PostgreSQL data workflows.',
        'Integrated payment and messaging services.',
      ],
    },
  ],
  education: [],
  projects: [
    {
      name: 'SokoEats',
      link: '',
      description:
        'Delivery application with merchant, admin and client systems.',
      bullets: [],
    },
  ],
  certifications: [],
  extras: { languages: ['English', 'Kiswahili'], interests: [] },
  additionalSections: [
    {
      title: 'Role Alignment',
      placement: 'main',
      content: 'API integrations and banking exposure.',
      bullets: [],
    },
  ],
  sectionLabels: {
    summary: 'Professional Profile',
    skills: 'Technical Skills',
    experience: 'Professional Experience',
    projects: 'Selected Projects',
    education: 'Education',
    certifications: 'Certifications',
    extras: 'Languages',
  },
};
let draft = {
  ...normalizeCvDraft({ templateId: 'ats-minimal', title: 'Resume QA' }),
  basics: { ...data.basics },
  id,
  userId: '1',
  updatedAt: new Date().toISOString(),
};
const generated = [];
const exports = [];
const versions = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: 'reduce',
});
const errors = [];
try {
  const token = jwt.sign({ id: 1 }, 'ui-test-only', { expiresIn: '1h' });
  await context.addInitScript((value) => {
    localStorage.setItem('token', value);
    localStorage.setItem('role', 'user');
  }, token);
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const method = request.method();
    let body = {};
    if (pathname === '/api/cv/templates') body = { templates: cvTemplates };
    else if (pathname === '/api/user/me')
      body = { email: 'paul@example.com', userId: 1, role: 'user', tokens: 0 };
    else if (pathname === '/api/profile/me') body = { profileExists: false };
    else if (pathname.includes('/entitlement'))
      body = { eligible: true, entitlementKey: 'resume_export' };
    else if (pathname === '/api/cv/original-resumes')
      body = {
        originalDocumentId,
        filename: 'source-resume.txt',
        warnings: [],
      };
    else if (pathname === '/api/cv/generate') {
      const payload = request.postDataJSON();
      generated.push(payload);
      const result = payload.section
        ? {
            ...payload.currentResume,
            summary: 'A shorter, source-grounded technical profile.',
          }
        : structuredClone(data);
      const versionId = `33333333-3333-4333-8333-${String(generated.length).padStart(12, '0')}`;
      const factReview = {
        sourceReadable: true,
        warnings: [],
        claims: collectResumeClaims(result).map((claim) => ({
          ...claim,
          classification: 'SUPPORTED',
          evidence: 'Source resume evidence.',
        })),
      };
      draft = {
        ...draft,
        ...result,
        templateId: payload.selectedTemplate,
        templateTheme: {},
        richText: {},
        generationMeta: {
          originalDocumentId,
          filename: 'source-resume.txt',
          generatedResumeVersionId: versionId,
          targetJobDescription: payload.targetJobDescription,
        },
        meta: { isDemoSeeded: false, hasImportedCv: true },
      };
      versions.unshift({
        id: versionId,
        resumeData: result,
        factReview,
        originalDocumentId,
        targetJobDescription: payload.targetJobDescription,
        createdAt: new Date().toISOString(),
        action: payload.section ? `regenerate:${payload.section}` : 'build',
      });
      body = { draft, factReview, generatedResumeVersionId: versionId };
    } else if (pathname.endsWith('/generated-versions')) body = { versions };
    else if (pathname === `/api/cv/drafts/${id}`) {
      if (method === 'PATCH')
        draft = {
          ...draft,
          ...request.postDataJSON(),
          updatedAt: new Date().toISOString(),
        };
      body = draft;
    } else if (pathname === '/api/cv/export') {
      exports.push(request.postDataJSON());
      body = {
        url: `${baseUrl}/qa.docx`,
        signedUrl: `${baseUrl}/qa.docx`,
        fileKey: 'qa.docx',
      };
    } else if (pathname === '/api/cv/drafts') body = [draft];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${baseUrl}/builder/${id}`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  const build = page.getByRole('button', {
    name: 'Build My Resume',
    exact: true,
  });
  await build.waitFor({ timeout: 120000 });
  await page
    .locator('#resume-source')
    .setInputFiles({
      name: 'source-resume.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(
        'Paul Mbugua\nEkaziConnect Solutions\nNode.js, PostgreSQL, REST APIs and payments.\n',
      ),
    });
  await page
    .locator('#resume-job')
    .fill(
      'VoPay Technical Analyst: investigate REST APIs, integrations, JSON and PostgreSQL data workflows.',
    );
  await page.locator('#resume-design').selectOption('executive-navy-orange');
  await page.screenshot({
    path: path.join(output, 'desktop-before-build.png'),
    fullPage: false,
  });
  await build.click();
  await page.getByRole('button', { name: /factual fields reviewed/ }).waitFor();
  assert.equal(generated.length, 1);
  assert.equal(generated[0].originalDocumentId, originalDocumentId);
  assert.equal(generated[0].selectedTemplate, 'executive-navy-orange');
  const preview = page.frameLocator('iframe[title^="CV preview"]');
  await preview.getByText('Paul Mbugua', { exact: true }).waitFor();
  await preview.getByText('Role Alignment', { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(output, 'desktop-generated.png'),
    fullPage: false,
  });
  await page.locator('#resume-design').selectOption('ats-minimal');
  await preview.locator('body[data-template-id="ats-minimal"]').waitFor();
  assert.equal(
    generated.length,
    1,
    'Design changes must never regenerate content',
  );
  await page
    .locator('[name="basics.headline"]')
    .fill('Technical Analyst | API Delivery');
  await page
    .getByRole('button', { name: 'Regenerate Section', exact: true })
    .click();
  await preview
    .getByText('A shorter, source-grounded technical profile.', { exact: true })
    .waitFor();
  assert.equal(generated.length, 2);
  assert.equal(generated[1].section, 'summary');
  assert.equal(
    generated[1].currentResume.basics.headline,
    'Technical Analyst | API Delivery',
  );
  await page
    .getByRole('combobox', { name: 'Export format' })
    .selectOption('docx');
  await page.getByRole('button', { name: 'Export DOCX', exact: true }).click();
  await page.getByRole('link', { name: 'Download', exact: true }).waitFor();
  assert.equal(exports.at(-1).format, 'docx');
  await page
    .getByRole('button', { name: 'Generation history', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Restore', exact: true })
    .last()
    .click();
  assert.equal(generated.length, 2);
  assert.equal(errors.length, 0, errors.join('\n'));
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: path.join(output, `builder-${width}.png`),
      fullPage: false,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    assert.equal(overflow, false, `Horizontal overflow at ${width}px`);
  }
  console.log(
    `UI checks passed: upload -> one full build -> preview -> no-cost design switch -> manual edit -> section refinement -> DOCX export -> history restore. Desktop/mobile screenshots: ${output}`,
  );
} finally {
  await context.close();
  await browser.close();
}
