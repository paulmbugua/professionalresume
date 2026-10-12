import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { ingestResume } from '../services/resumeIngestionService.js';
import { generateResume } from '../services/resumeGenerationService.js';
import { resumeToDocxBuffer } from '../services/resumeDocxService.js';
import { renderCvHtmlByTemplate } from '../../../packages/shared/cv/renderers/index.js';
dotenv.config();
if (!process.env.OPENAI_API_KEY) {
  console.log('Live AI check skipped: OPENAI_API_KEY is not configured.');
  process.exit(0);
}
const original = `SYNTHETIC QA CANDIDATE (not a real person)
Amina Kamau
Nairobi, Kenya | amina@example.com | +254700000000
Founder & Lead Software Engineer, Example Integration Studio
2024 - Present
Built REST APIs with Node.js and Express. Implemented PostgreSQL data workflows,
Docker development environments, payment and messaging integrations. Investigated
production logs and wrote technical integration documentation.
Banking Operations Associate, Example Bank
2021 - 2024
Supported customers with payment queries and collaborated with technical teams on
transaction reconciliation and incident investigation.
Project: DeliveryWorks
Delivery application with merchant, admin and client systems using React,
Node.js and PostgreSQL. Includes payments and order notifications.
BSc Computer Science, Example University, 2017 - 2021.
Languages: English, Kiswahili.
No Laravel, PHP, AWS or Kubernetes experience is claimed in this source document.`;
const source = await ingestResume({
  buffer: Buffer.from(original),
  filename: 'synthetic-qa.txt',
  mimetype: 'text/plain',
});
const result = await generateResume({
  originalResumeDocument: source,
  targetJobDescription:
    'Technical Analyst role at a payments company. Analyze REST APIs, webhooks, JSON contracts and SQL data mapping. Investigate payment integration issues using logs. Work with customers, banking stakeholders and engineering teams. Document integration behavior and requirements. Laravel, PHP, AWS and Kubernetes experience would be desirable.',
  selectedTemplate: 'executive-navy-orange',
  generationPreferences: { tone: 'professional' },
});
assert.equal(result.resumeData.basics.name, 'Amina Kamau');
assert.ok(
  result.resumeData.experience.some(
    (entry) => entry.company === 'Example Integration Studio',
  ),
);
for (const forbidden of ['Laravel', 'PHP', 'AWS', 'Kubernetes'])
  assert.ok(
    !result.resumeData.skills.some((skill) => skill.includes(forbidden)),
    `Unsupported skill: ${forbidden}`,
  );
assert.ok(
  !result.factReview.claims.some(
    (claim) => claim.classification === 'UNSUPPORTED',
  ),
);
const output = path.join(process.env.TEMP || '.', 'professionalresume-ai-qa');
await fs.mkdir(output, { recursive: true });
await fs.writeFile(
  path.join(output, 'live-synthetic-resume.json'),
  JSON.stringify(result, null, 2),
);
await fs.writeFile(
  path.join(output, 'live-synthetic-resume.html'),
  renderCvHtmlByTemplate({
    ...result.resumeData,
    templateId: 'executive-navy-orange',
  }),
);
await fs.writeFile(
  path.join(output, 'live-synthetic-resume.docx'),
  await resumeToDocxBuffer({
    ...result.resumeData,
    templateId: 'executive-navy-orange',
  }),
);
console.log(
  `Live generation and independent audit passed. Model: ${result.model}; reviewed fields: ${result.factReview.claims.length}; synthetic artifacts: ${output}`,
);
