import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildCvHtml, htmlToPdfBuffer } from '../services/cvRenderService.js';
import { resumeToDocxBuffer } from '../services/resumeDocxService.js';
import { PDFParse } from 'pdf-parse';

const output = path.join(process.env.TEMP || '.', 'professionalresume-ai-qa');
await fs.mkdir(output, { recursive: true });
const resume = {
  templateId: 'executive-navy-orange',
  title: 'Synthetic export QA',
  basics: {
    name: 'Amina Kamau',
    headline: 'Technical Analyst | APIs & Integrations',
    email: 'amina@example.com',
    phone: '+254700000000',
    location: 'Nairobi, Kenya',
    links: [],
  },
  summary:
    'Software engineer with API integration and banking experience. Investigates data workflows, writes technical documentation and works with engineering teams on payment integrations.',
  skills: [
    'Node.js',
    'Express',
    'PostgreSQL',
    'REST APIs',
    'Docker',
    'Technical documentation',
  ],
  experience: [
    {
      company: 'Example Integration Studio',
      role: 'Founder & Lead Software Engineer',
      start: '2024',
      end: 'Present',
      location: 'Nairobi',
      description: 'Application and integration engineering.',
      bullets: [
        'Built REST APIs using Node.js and Express.',
        'Investigated PostgreSQL data workflows and production logs.',
        'Implemented payment and messaging integrations.',
        'Documented API contracts and integration behavior.',
      ],
    },
    {
      company: 'Example Bank',
      role: 'Banking Operations Associate',
      start: '2021',
      end: '2024',
      description: 'Customer-facing banking operations.',
      bullets: [
        'Investigated payment queries and transaction reconciliation.',
        'Worked with technical teams on incident investigation.',
      ],
    },
  ],
  projects: [
    {
      name: 'DeliveryWorks',
      description:
        'Delivery application with merchant, administrator and customer systems.',
      link: '',
      bullets: [
        'Built order workflows, notifications and payment integrations.',
      ],
    },
  ],
  education: [
    {
      school: 'Example University',
      program: 'BSc Computer Science',
      start: '2017',
      end: '2021',
      details: '',
    },
  ],
  certifications: [],
  extras: { languages: ['English', 'Kiswahili'], interests: [] },
  additionalSections: [
    {
      title: 'Role Alignment',
      placement: 'main',
      content: 'API integrations, SQL investigation and banking operations.',
      bullets: [],
    },
  ],
};
const html = buildCvHtml({ draft: resume });
await fs.writeFile(path.join(output, 'executive-export.html'), html);
const pdf = await htmlToPdfBuffer(html);
await fs.writeFile(path.join(output, 'executive-export.pdf'), pdf);
await fs.writeFile(
  path.join(output, 'executive-export.docx'),
  await resumeToDocxBuffer(resume),
);
const parser = new PDFParse({ data: pdf });
try {
  const extracted = await parser.getText();
  for (const content of [
    'Amina Kamau',
    'Role Alignment',
    'DeliveryWorks',
    'Example Bank',
    'BSc Computer Science',
  ])
    assert.ok(
      extracted.text
        .replace(/\s+/g, '')
        .toLowerCase()
        .includes(content.replace(/\s+/g, '').toLowerCase()),
      `PDF missing ${content}`,
    );
  assert.equal(
    extracted.total,
    1,
    'This concise fixture should fit on one A4 page.',
  );
  console.log(
    `PDF export passed: all sections retained; ${extracted.total} A4 page; ${pdf.length} bytes. Artifacts: ${output}`,
  );
} finally {
  await parser.destroy();
}

const paginationResume = {
  ...structuredClone(resume),
  title: 'Smart pagination regression',
  summary:
    'Senior software engineer delivering reliable digital services, payment integrations and operational systems for Kenyan businesses. Combines hands-on product engineering with technical leadership, stakeholder communication and disciplined production support.',
  experience: [
    {
      company: 'EkaziConnect Solutions Ltd',
      role: 'Founder & Lead Software Engineer',
      start: '2024',
      end: 'Present',
      location: 'Nairobi, Kenya',
      description: 'Leads product architecture and full-stack delivery for employment and service platforms.',
      bullets: Array.from({ length: 5 }, (_, index) =>
        `Delivered production workflow ${index + 1} across customer, operations and administration systems using measured API contracts, PostgreSQL data controls and documented release checks.`,
      ),
    },
    {
      company: 'Example Digital Studio',
      role: 'Senior Full Stack Developer',
      start: '2021',
      end: '2024',
      location: 'Nairobi, Kenya',
      description: 'Built and supported web platforms for growing local businesses.',
      bullets: Array.from({ length: 3 }, (_, index) =>
        `Improved service capability ${index + 1} through maintainable interfaces, automated checks and clear operational documentation for support teams.`,
      ),
    },
  ],
  projects: [
    {
      name: 'SokoEats',
      description: 'Delivery platform connecting merchants, administrators, riders and customers.',
      link: '',
      bullets: [
        'Implemented ordering, payment and delivery-status workflows.',
        'Connected merchant operations with customer notifications and fulfilment views.',
        'Documented production support checks for transaction and delivery issues.',
      ],
    },
    {
      name: 'Ekazi',
      description: 'Service marketplace matching Kenyan customers with verified professionals.',
      link: '',
      bullets: [
        'Built account, discovery and service-request workflows.',
        'Designed operational views for provider verification and customer support.',
        'Improved API boundaries for reliable mobile and administrative experiences.',
      ],
    },
    {
      name: 'AllShops POS',
      description: 'Retail operations platform for stock, sales and daily reporting.',
      link: '',
      bullets: [
        'Implemented inventory and transaction reporting capabilities.',
        'Built daily reconciliation views for sales and stock movement.',
        'Added documented controls for corrections, returns and audit review.',
      ],
    },
  ],
};

const paginationHtml = buildCvHtml({ draft: paginationResume });
assert.ok(!/(experience|projects)[^{]{0,80}\{[^}]*page-break-(before|after)\s*:\s*always/i.test(paginationHtml));
assert.ok(paginationHtml.includes('cv-entry--splittable'));
assert.ok(paginationHtml.includes('cv-entry--compact'));
assert.ok(paginationHtml.includes('cv-smart-pagination-runtime'));
let paginationMetrics = null;
const paginationPdf = await htmlToPdfBuffer(paginationHtml, {
  onPaginationMetrics: (metrics) => {
    paginationMetrics = metrics;
  },
});
await fs.writeFile(path.join(output, 'smart-pagination-regression.pdf'), paginationPdf);
const paginationParser = new PDFParse({ data: paginationPdf });
try {
  const extracted = await paginationParser.getText();
  assert.ok(extracted.total >= 2, 'Regression fixture should exercise multiple A4 pages.');
  assert.ok(extracted.total <= 2, 'Content should rebalance without creating a tiny third page.');
  assert.equal(
    paginationMetrics?.pageCount,
    extracted.total,
    'Preview/runtime and exported PDF must have the same page count.',
  );
  assert.ok(
    paginationMetrics?.explicitPages,
    'Sidebar designs should use measured A4 page shells.',
  );
  assert.ok(
    paginationMetrics?.utilization?.[0] >= 85,
    'Page 1 should use at least 85% of its printable content column.',
  );
  assert.ok(
    paginationMetrics?.utilization?.at(-1) >= 35,
    'A sparse final page should be rebalanced to at least 35% when possible.',
  );
  assert.ok(
    paginationMetrics.usedPx.every((height) => height <= paginationMetrics.pageHeightPx),
    'No page content may overflow or clip past the A4 page height.',
  );
  assert.ok(
    extracted.pages?.[0]?.text.includes('SokoEats'),
    'Projects should begin in the available space on page 1.',
  );
  assert.ok(
    extracted.pages?.[1]?.text.includes('AllShops POS'),
    'The Projects section should continue naturally on page 2.',
  );
  assert.ok(extracted.text.includes('SokoEats'));
  assert.ok(extracted.text.includes('AllShops POS'));
} finally {
  await paginationParser.destroy();
}
