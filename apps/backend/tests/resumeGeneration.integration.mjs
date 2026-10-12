import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { Responses } from '../node_modules/openai/resources/responses/responses.mjs';
import { collectResumeClaims } from '../services/resumeGenerationSchema.js';

dotenv.config();
const host = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL).hostname
  : process.env.DB_HOST || 'localhost';
assert.ok(
  ['localhost', '127.0.0.1', '::1'].includes(host),
  'This integration check runs against local PostgreSQL only.',
);
process.env.SKIP_DB_STARTUP_PROBE = 'true';
process.env.OPENAI_API_KEY = 'mock-key-never-sent';
const { default: appPool } = await import('../config/db.js');
const {
  ingestOriginalResume,
  buildAiResume,
  getResumeVersions,
  downloadOriginalResume,
} = await import('../controllers/resumeGenerationController.js');
const schema = `resume_ai_test_${crypto.randomBytes(8).toString('hex')}`;
const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };
const admin = new Pool(config);
const isolated = new Pool({
  ...config,
  options: `-c search_path=${schema},public`,
});
appPool.query = isolated.query.bind(isolated);
appPool.connect = isolated.connect.bind(isolated);
const migration = await fs.readFile(
  new URL('../migrations/20261012_ai_first_resume.sql', import.meta.url),
  'utf8',
);
const resumeData = {
  basics: {
    name: 'Source Candidate',
    headline: 'Technical Analyst',
    email: '',
    phone: '',
    location: '',
    links: [],
  },
  targetTitle: 'Technical Analyst',
  summary: 'API engineer with Node.js and PostgreSQL experience.',
  skills: ['Node.js', 'PostgreSQL'],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  extras: { languages: [], interests: [] },
  additionalSections: [],
  sectionLabels: Object.fromEntries(
    [
      'summary',
      'skills',
      'experience',
      'education',
      'projects',
      'certifications',
      'extras',
    ].map((key) => [key, key]),
  ),
};
let aiCalls = 0;
let unsupported = false;
let concurrentDraft;
const originalCreate = Responses.prototype.create;
Responses.prototype.create = async function (request) {
  aiCalls++;
  let result = resumeData;
  if (request.text.format.name === 'rebuilt_resume' && concurrentDraft)
    await isolated.query('UPDATE cv_drafts SET version=version+1 WHERE id=$1', [
      concurrentDraft,
    ]);
  if (request.text.format.name === 'resume_fact_review') {
    result = {
      sourceReadable: true,
      warnings: [],
      claims: collectResumeClaims(resumeData).map((claim, index) => ({
        ...claim,
        classification:
          unsupported && index === 0 ? 'UNSUPPORTED' : 'SUPPORTED',
        evidence: 'Original document evidence.',
      })),
    };
  }
  return { status: 'completed', output_text: JSON.stringify(result) };
};
function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    send(body) {
      this.body = body;
    },
  };
}
try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await isolated.query(`CREATE TABLE users(id BIGINT PRIMARY KEY); INSERT INTO users VALUES(1),(2);
    CREATE TABLE cv_drafts(id UUID PRIMARY KEY, user_id BIGINT REFERENCES users(id),title TEXT,template_key TEXT,data_json JSONB,version INTEGER DEFAULT 1,is_deleted BOOLEAN DEFAULT FALSE,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());`);
  await isolated.query(migration);
  await isolated.query(migration);
  const bytes = Buffer.from(
    'Source Candidate\nTechnical Analyst\nAPI engineer with Node.js and PostgreSQL experience.\n',
  );
  const upload = response();
  await ingestOriginalResume(
    {
      user: { id: 1 },
      file: {
        buffer: bytes,
        originalname: 'original.txt',
        mimetype: 'text/plain',
      },
    },
    upload,
  );
  assert.equal(upload.statusCode, 201);
  const sourceId = upload.body.originalDocumentId;
  const stored = await isolated.query(
    'SELECT bytes FROM original_resume_files WHERE id=$1',
    [upload.body.originalFileId],
  );
  assert.deepEqual(stored.rows[0].bytes, bytes);
  const buildBody = {
    originalDocumentId: sourceId,
    targetJobDescription:
      'Technical Analyst needed for APIs and PostgreSQL integration investigations.',
    selectedTemplate: 'executive-navy-orange',
  };
  const forbidden = response();
  await buildAiResume({ user: { id: 2 }, body: buildBody }, forbidden);
  assert.equal(forbidden.statusCode, 404);
  assert.equal(aiCalls, 0);
  const built = response();
  await buildAiResume({ user: { id: 1 }, body: buildBody }, built);
  assert.equal(built.statusCode, 200, JSON.stringify(built.body));
  assert.equal(aiCalls, 2);
  const draftId = built.body.draft.id;
  const history = response();
  await getResumeVersions(
    { user: { id: 1 }, params: { id: draftId } },
    history,
  );
  assert.equal(history.body.versions.length, 1);
  const otherHistory = response();
  await getResumeVersions(
    { user: { id: 2 }, params: { id: draftId } },
    otherHistory,
  );
  assert.deepEqual(otherHistory.body.versions, []);
  const download = response();
  await downloadOriginalResume(
    { user: { id: 1 }, params: { id: sourceId } },
    download,
  );
  assert.deepEqual(download.body, bytes);
  const deniedDownload = response();
  await downloadOriginalResume(
    { user: { id: 2 }, params: { id: sourceId } },
    deniedDownload,
  );
  assert.equal(deniedDownload.statusCode, 404);
  unsupported = true;
  const rejected = response();
  await buildAiResume(
    { user: { id: 1 }, body: { ...buildBody, draftId } },
    rejected,
  );
  assert.equal(rejected.statusCode, 422);
  assert.equal(rejected.body.code, 'UNSUPPORTED_RESUME_CLAIMS');
  unsupported = false;
  concurrentDraft = draftId;
  const conflict = response();
  await buildAiResume(
    { user: { id: 1 }, body: { ...buildBody, draftId } },
    conflict,
  );
  assert.equal(conflict.statusCode, 409);
  const saved = await isolated.query(
    'SELECT count(*)::int AS count FROM generated_resume_versions',
  );
  assert.equal(saved.rows[0].count, 1);
  console.log(
    'Integration checks passed: source retention, ownership, atomic versioning, factual rejection, concurrent edit protection, idempotent migration. No live model calls.',
  );
  if (process.argv.includes('--apply-local')) {
    await admin.query(migration);
    console.log('AI-first resume migration applied to local PostgreSQL.');
  }
} finally {
  Responses.prototype.create = originalCreate;
  await isolated.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.end();
  await appPool.end();
}
