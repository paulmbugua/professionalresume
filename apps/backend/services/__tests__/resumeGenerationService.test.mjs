import test from 'node:test';
import assert from 'node:assert/strict';
import mammoth from 'mammoth';
import {
  ingestResume,
  originalDocumentInput,
} from '../resumeIngestionService.js';
import { generateResume } from '../resumeGenerationService.js';
import {
  collectResumeClaims,
  assertFactReview,
} from '../resumeGenerationSchema.js';
import { resumeToDocxBuffer } from '../resumeDocxService.js';
import { renderersById } from '../../../../packages/shared/cv/renderers/index.js';

const originalText =
  'Paul Mbugua\nFounder & Lead Software Engineer\nEkaziConnect Solutions Ltd\n2024 - Present\nReact, Node.js, Express, PostgreSQL, Docker, REST APIs.\nSokoEats: delivery mobile application with merchant, admin and client systems.\nEquity Bank: banking experience.\n';
export const candidate = {
  basics: {
    name: 'Paul Mbugua',
    headline: 'Technical Analyst | APIs & Integrations',
    email: '',
    phone: '',
    location: '',
    links: [],
  },
  targetTitle: 'Technical Analyst | APIs & Integrations',
  summary:
    'Software engineer with REST API development and banking experience.',
  skills: ['Node.js', 'REST APIs', 'PostgreSQL', 'Docker'],
  experience: [
    {
      company: 'EkaziConnect Solutions Ltd',
      role: 'Founder & Lead Software Engineer',
      start: '2024',
      end: 'Present',
      location: '',
      description: 'API engineering role.',
      bullets: ['Developed REST APIs with Node.js and PostgreSQL.'],
    },
  ],
  education: [],
  projects: [
    {
      name: 'SokoEats',
      link: '',
      description:
        'Delivery mobile application with merchant, admin and client systems.',
      bullets: [],
    },
  ],
  certifications: [],
  extras: { languages: [], interests: [] },
  additionalSections: [
    {
      title: 'Role Alignment',
      placement: 'main',
      content: 'REST API development and banking exposure.',
      bullets: [],
    },
    {
      title: 'Technical Strengths',
      placement: 'sidebar',
      content: 'PostgreSQL investigation',
      bullets: [],
    },
  ],
  sectionLabels: {
    summary: 'Professional Profile',
    skills: 'Core Skills',
    experience: 'Professional Experience',
    education: 'Education',
    projects: 'Selected Projects',
    certifications: 'Certifications',
    extras: 'Languages & Interests',
  },
};
const reviewFor = (resume) => ({
  sourceReadable: true,
  warnings: [],
  claims: collectResumeClaims(resume).map((claim) => ({
    ...claim,
    classification: 'SUPPORTED',
    evidence: 'Candidate source document evidence.',
  })),
});
const source = () =>
  ingestResume({
    buffer: Buffer.from(originalText),
    filename: 'original.txt',
    mimetype: 'text/plain',
  });
function mockAi(responses, calls) {
  return {
    responses: {
      create: async (request) => {
        calls.push(request);
        const data =
          typeof responses[0] === 'function'
            ? responses.shift()(request)
            : responses.shift();
        return { status: 'completed', output_text: JSON.stringify(data) };
      },
    },
  };
}
const buildArgs = {
  targetJobDescription:
    'VoPay Technical Analyst: REST APIs, integrations, SQL, Laravel, PHP and AWS.',
  selectedTemplate: 'executive-navy-orange',
};

test('initial build sends the entire unstructured source, vacancy and design to exactly one generation plus one audit', async () => {
  const calls = [];
  const result = await generateResume({
    ...buildArgs,
    originalResumeDocument: await source(),
    client: mockAi([candidate, reviewFor(candidate)], calls),
  });
  assert.equal(calls.length, 2);
  assert.equal(
    calls[0].input[0].content[0].text,
    `COMPLETE ORIGINAL RESUME DOCUMENT\n${originalText}`,
  );
  const context = JSON.parse(calls[0].input[0].content[1].text);
  assert.equal(context.targetJobDescription, buildArgs.targetJobDescription);
  assert.equal(context.selectedTemplate.layout, 'sidebar-main');
  assert.equal(context.selectedTemplate.summaryWordLimit, 75);
  assert.equal(context.selectedTemplate.pagination.mode, 'continuous-flow');
  assert.deepEqual(
    context.selectedTemplate.pagination.targetUtilizationPercent,
    [85, 95],
  );
  assert.equal(
    context.selectedTemplate.pagination.minimumFinalPageUtilizationPercent,
    35,
  );
  assert.ok(!('parsedResume' in context));
  assert.ok(!JSON.stringify(result.resumeData).includes('Laravel'));
  assert.equal(
    result.resumeData.experience[0].role,
    'Founder & Lead Software Engineer',
  );
  assert.equal(calls[0].store, false);
});
test('unsupported requirements copied into generated skills are rejected', async () => {
  const bad = structuredClone(candidate);
  bad.skills.push('5 years Laravel experience');
  const review = reviewFor(bad);
  review.claims.find(
    (claim) => claim.statement === '5 years Laravel experience',
  ).classification = 'UNSUPPORTED';
  await assert.rejects(
    generateResume({
      ...buildArgs,
      originalResumeDocument: await source(),
      client: mockAi([bad, review], []),
    }),
    { code: 'UNSUPPORTED_RESUME_CLAIMS' },
  );
});
test('provider authentication failures are service errors, never user logout errors', async () => {
  for (const status of [401, 403]) {
    await assert.rejects(
      generateResume({
        ...buildArgs,
        originalResumeDocument: await source(),
        client: {
          responses: {
            create: async () => {
              throw Object.assign(new Error('Provider failure'), { status });
            },
          },
        },
      }),
      { status: 503 },
    );
  }
});
test('rate limits retry and fall back before returning an actionable 429', async () => {
  const models = [];
  const client = {
    responses: {
      create: async (request, options) => {
        models.push({ model: request.model, options });
        if (models.length === 1)
          throw Object.assign(new Error('Provider busy'), {
            status: 429,
            headers: { 'retry-after': '17' },
          });
        return {
          status: 'completed',
          output_text: JSON.stringify(
            models.length === 2 ? candidate : reviewFor(candidate),
          ),
        };
      },
    },
  };
  const result = await generateResume({
    ...buildArgs,
    model: 'gpt-primary',
    originalResumeDocument: await source(),
    client,
  });
  assert.deepEqual(
    models.map((call) => call.model),
    ['gpt-primary', 'gpt-6-luna', 'gpt-6-luna'],
  );
  assert.equal(models[0].options.maxRetries, 1);
  assert.equal(result.model, 'gpt-6-luna');

  await assert.rejects(
    generateResume({
      ...buildArgs,
      model: 'gpt-primary',
      originalResumeDocument: await source(),
      client: {
        responses: {
          create: async () => {
            throw Object.assign(new Error('Provider busy'), {
              status: 429,
              headers: { 'retry-after': '17' },
            });
          },
        },
      },
    }),
    { status: 429, code: 'AI_RATE_LIMITED', retryAfter: 17 },
  );
});
test('billing and usage cap errors are not presented as temporary throttling', async () => {
  await assert.rejects(
    generateResume({
      ...buildArgs,
      model: 'gpt-primary',
      originalResumeDocument: await source(),
      client: {
        responses: {
          create: async () => {
            throw Object.assign(new Error('Project cap reached'), {
              status: 429,
              code: 'project_spend_limit_exceeded',
              type: 'rate_limit_error',
              request_id: 'req_test',
              headers: {
                'x-ratelimit-limit-tokens': '10000',
                'x-ratelimit-remaining-tokens': '0',
              },
            });
          },
        },
      },
    }),
    (error) => {
      assert.equal(error.status, 429);
      assert.equal(error.code, 'AI_QUOTA_EXCEEDED');
      assert.equal(error.retryAfter, undefined);
      assert.equal(error.providerRequestId, 'req_test');
      assert.equal(error.providerDetails.providerCode, 'project_spend_limit_exceeded');
      assert.equal(error.providerDetails.rateLimits.tokensRemaining, '0');
      return true;
    },
  );
});
test('missing, unreadable, duplicate, mismatched and evidence-free reviews cannot pass', () => {
  for (const mutate of [
    (review) => review.claims.pop(),
    (review) => {
      review.sourceReadable = false;
    },
    (review) => review.claims.push(review.claims[0]),
    (review) => {
      review.claims[0].statement = 'Other candidate';
    },
    (review) => {
      review.claims[0].evidence = '';
    },
  ]) {
    const review = reviewFor(candidate);
    mutate(review);
    assert.throws(() => assertFactReview(candidate, review));
  }
});
test('section regeneration uses full source and changes only the requested section', async () => {
  const rebuilt = {
    ...candidate,
    summary: 'Concise source-grounded professional summary.',
  };
  const calls = [];
  const result = await generateResume({
    ...buildArgs,
    originalResumeDocument: await source(),
    currentResume: candidate,
    section: 'summary',
    instruction: 'Shorten this.',
    client: mockAi([{ value: rebuilt.summary }, reviewFor(rebuilt)], calls),
  });
  assert.equal(result.resumeData.summary, rebuilt.summary);
  assert.deepEqual(result.resumeData.experience, candidate.experience);
  assert.equal(calls.length, 2);
  assert.equal(
    calls[1].input[0].content[0].text,
    calls[0].input[0].content[0].text,
  );
});
test('full PDF bytes and image bytes reach AI without field extraction', async () => {
  const pdf = Buffer.from('%PDF-1.7\noriginal visual content');
  const sourcePdf = await ingestResume({
    buffer: pdf,
    filename: 'scan.pdf',
    mimetype: 'application/pdf',
  });
  assert.equal(sourcePdf.document.text, '');
  assert.equal(
    originalDocumentInput(sourcePdf)[0].file_data,
    `data:application/pdf;base64,${pdf.toString('base64')}`,
  );
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.from('image payload'),
  ]);
  const sourceImage = await ingestResume({
    buffer: png,
    filename: 'scan.png',
    mimetype: 'image/png',
  });
  assert.equal(originalDocumentInput(sourceImage)[0].type, 'input_image');
});
test('ingestion rejects unsupported, invalid, empty and oversized sources instead of truncating', async () => {
  for (const input of [
    { buffer: Buffer.alloc(0), filename: 'cv.txt' },
    { buffer: Buffer.alloc(8 * 1024 * 1024 + 1), filename: 'cv.pdf' },
    { buffer: Buffer.from('not pdf'), filename: 'cv.pdf' },
    { buffer: Buffer.from('x'), filename: 'cv.docx' },
    { buffer: Buffer.from('CV'), filename: 'cv.exe' },
    { buffer: Buffer.from('a'.repeat(120001)), filename: 'cv.txt' },
  ])
    await assert.rejects(ingestResume(input));
});
test('long document tail remains available to AI', async () => {
  const text = `${originalText}${'Full context. '.repeat(5000)}TAIL_PROJECT_SOURCE_FACT`;
  const doc = await ingestResume({
    buffer: Buffer.from(text),
    filename: 'long.txt',
  });
  assert.equal(doc.document.text, text);
  assert.ok(
    originalDocumentInput(doc)[0].text.endsWith('TAIL_PROJECT_SOURCE_FACT'),
  );
});
test('every design renders additional sections and role descriptions without another AI call', () => {
  for (const [templateId, render] of Object.entries(renderersById)) {
    const html = render({ ...candidate, templateId });
    assert.ok(
      html.includes('Role Alignment'),
      `${templateId} missing main section`,
    );
    assert.ok(
      html.includes('Technical Strengths'),
      `${templateId} missing sidebar section`,
    );
    assert.ok(
      html.includes('API engineering role.'),
      `${templateId} missing description`,
    );
    assert.ok(
      html.includes('Professional Experience'),
      `${templateId} missing renamed heading`,
    );
    assert.ok(html.includes(`data-template-id="${templateId}"`));
  }
});
test('DOCX exports all content and can be ingested without losing the document tail', async () => {
  for (const templateId of ['ats-minimal', 'executive-navy-orange']) {
    const buffer = await resumeToDocxBuffer({ ...candidate, templateId });
    assert.equal(buffer.subarray(0, 2).toString(), 'PK');
    const { value } = await mammoth.extractRawText({ buffer });
    for (const text of [
      'Paul Mbugua',
      'API engineering role.',
      'SokoEats',
      'Role Alignment',
      'Technical Strengths',
    ])
      assert.ok(
        value.toLowerCase().includes(text.toLowerCase()),
        `${templateId}: ${text}`,
      );
    const doc = await ingestResume({ buffer, filename: 'resume.docx' });
    assert.equal(doc.document.text, value);
    assert.equal(originalDocumentInput(doc)[0].type, 'input_file');
    assert.ok(
      originalDocumentInput(doc)[0].file_data.endsWith(
        buffer.toString('base64'),
      ),
    );
  }
});
