import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseExperience,
  parseEducation,
  normalizeExtractedDraft,
} from '../cvParseService.js';
import { mapExtractedResumeToCvDraft } from '../../../../packages/shared/cv/mapExtractedResumeToCvDraft.js';

test('parseExperience maps role/company/date/bullets', () => {
  const lines = [
    'Senior Software Engineer - Acme Corp',
    'Jan 2020 - Present',
    '- Built internal tooling',
    '- Mentored junior engineers',
  ];
  const result = parseExperience(lines);
  assert.equal(result.length, 1);
  assert.equal(result[0].role, 'Senior Software Engineer');
  assert.equal(result[0].company, 'Acme Corp');
  assert.equal(result[0].start, 'Jan 2020');
  assert.equal(result[0].end, 'Present');
  assert.equal(result[0].bullets.length, 2);
});

test('normalizeExtractedDraft dedupes links and caps list sizes', () => {
  const result = normalizeExtractedDraft({
    basics: {
      links: [
        { label: 'Portfolio', url: 'https://example.com' },
        { label: 'Portfolio', url: 'example.com' },
      ],
    },
    skills: Array.from({ length: 60 }, (_, i) => `Skill ${i}`),
  });

  assert.equal(result.basics.links.length, 1);
  assert.equal(result.skills.length, 50);
});

test('maps grouped skills categories and preserves github/portfolio links', () => {
  const normalized = mapExtractedResumeToCvDraft(
    {
      basics: {
        name: 'PAUL MBUGUA',
        headline: 'Senior Full Stack Developer / Platform Engineer',
        links: [{ label: 'Website', url: 'pauldevworks.novagptech.com' }],
      },
      skills: [
        'Backend: Node.js, Express, PostgreSQL',
        'Frontend: React, Next.js',
      ],
      extras: { languages: ['English (Fluent)', 'Arabic (Basic)'] },
    },
    {
      rawText:
        'Location Qatar\nEmail paulpep2002@gmail.com\nPhone +974 39918177\nGitHub github.com/paulmbugua',
    },
  );

  assert.equal(normalized.basics.name, 'PAUL MBUGUA');
  assert.equal(normalized.basics.email, 'paulpep2002@gmail.com');
  assert.equal(normalized.basics.phone, '+974 39918177');
  assert.equal(normalized.skills.includes('Node.js'), true);
  assert.equal(normalized.skills.includes('React'), true);
  assert.equal(normalized.extras.languages.length, 2);
  assert.equal(normalized.basics.links.some((l) => /github\.com\/paulmbugua/i.test(l.url)), true);
  assert.equal(normalized.basics.links.some((l) => /novagptech\.com/i.test(l.url)), true);
});

test('parseExperience handles Role — Company | Dates format', () => {
  const result = parseExperience([
    'Platform Engineer — Nova Systems | 2022 - Present',
    '- Built platform APIs',
    'Senior Developer — Alpha Labs | 2020 - 2022',
    '- Led migration',
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].role, 'Platform Engineer');
  assert.equal(result[0].company, 'Nova Systems');
  assert.equal(result[0].start, '2022');
  assert.equal(result[0].end, 'Present');
});

test('parseEducation keeps multiple education entries', () => {
  const result = parseEducation([
    'University of Nairobi - BSc Computer Science',
    '2016 - 2020',
    'Qatar Technical Institute - Diploma Information Technology',
    '2014 - 2016',
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].school, 'University of Nairobi');
  assert.equal(result[1].school, 'Qatar Technical Institute');
});
