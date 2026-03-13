import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExperience, normalizeExtractedDraft } from '../cvParseService.js';

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
