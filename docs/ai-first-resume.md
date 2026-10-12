# AI-first resume builder

## User flow

Sign in, open the resume builder, upload an original PDF/DOCX/TXT or scanned image,
paste the complete vacancy, choose a design and click **Build My Resume**.
The result opens in the existing editable builder. Changing design renders the same
data without another AI request. PDF and DOCX exports share the existing resume
M-Pesa entitlement; cover-letter access remains separate.

## Architecture

`resumeIngestionService` preserves original bytes and document contents. It does
not identify resume headings, sections, skills, employment or education.
PDF and DOCX originals are sent directly as Responses API file inputs. PNG/JPEG/WebP
are sent as visual inputs. TXT contents are sent in full. DOCX raw text is retained
for document inspection, but is not mapped to a candidate schema before generation.
Limits: 8 MB per upload, 120,000 extracted text characters, 60,000 vacancy characters.
Oversized input is rejected, never silently truncated.

`resumeGenerationService.generateResume` receives the original document, complete
job description, server-owned template metadata and writing preferences. One
structured-output generation produces the entire candidate document. A separate
audit receives the same original and all nonempty factual output fields. Every
field must receive an evidence-bearing SUPPORTED or REASONABLE_REPHRASE review.
Unreadable sources, incomplete reviews and UNSUPPORTED claims block publication
to the draft. This is an AI audit, not a guarantee that all model judgments are correct;
users should review the generated document and the supplied evidence.

Template metadata constrains content density and section capacity. The renderer
owns all layout, colors, typography and pagination. The navy-and-orange executive
design uses the existing sidebar renderer, and additional sections flow into the
appropriate sidebar/main area or into the normal flow of single-column designs.

### Smart A4 pagination

Preview and PDF export inject the same shared pagination runtime after template
rendering and font loading. It measures the rendered DOM at true A4 dimensions,
never assigns page numbers to section names, and treats headings, compact entries,
long experience entries and bullets as different logical blocks. Section headings
stay with their first item, compact project/education entries stay together when
practical, and long experience bullet lists can continue on another page.

Sidebar designs are rebuilt into explicit 210 mm x 297 mm page shells so the main
column can flow independently while the sidebar remains full height on every page.
A final page below 35% utilization triggers a spacing-only rebalance and may move
the last compact entry forward while preserving at least 75% of the preceding page.
Font sizes are not reduced by this pass. In development, append
`?cvLayoutDebug=1` to the builder URL to show measured page utilization and block
outlines; the diagnostics are disabled in production.

Subsequent section regeneration receives the complete original and current document;
only the selected section is generated. It undergoes the same independent audit.
Manual edits are allowed and are not automatically represented as verified facts.

## Persistence and ownership

Migration `20261012_ai_first_resume.sql` creates:

- `original_resume_files`: original filename, MIME type, SHA-256 and private bytes.
- `original_resume_documents`: document kind, raw text when applicable and ingestion warnings.
- `cv_drafts`: the editable generated resume (existing table).
- `generated_resume_versions`: immutable generated data, review, vacancy, design and model.

Original documents and versions are scoped by authenticated user ID. Originals are
downloaded through an authenticated endpoint, not a public asset URL. Draft updates
and version creation are committed in one transaction. Optimistic version checks
prevent concurrent edits from being overwritten. The builder pauses editing and
autosave while AI works, and saves outstanding edits before generation.

## API

- `POST /api/cv/original-resumes`: authenticated multipart `file` ingestion.
- `POST /api/cv/generate`: originalDocumentId, targetJobDescription, selectedTemplate,
  optional draftId, generationPreferences. For section refinement also supply section,
  instruction and currentResume.
- `GET /api/cv/original-resumes/:id/file`: private original download.
- `GET /api/cv/drafts/:id/generated-versions`: last 20 generated versions.
- `POST /api/cv/export`: existing endpoint, now accepts `format: pdf | docx`.

## Migration from parsing

The old `CvForm` parsing/merge controls and their client-side mapping code were removed.
New generation does not import `cvParseService`, `mapExtractedResumeToCvDraft`,
or any extracted-field DTO. `/api/cv/parse` stays available only for legacy integrations.
`atsCheckerService` and `coverLetterImportService` still consume the old module's
generic text readers, so that module and its tests remain isolated from the new path.
Existing manual AI assist stays available for old/manual drafts; generated resumes
use the original-document refinement panel.

## Configuration and validation

Set `OPENAI_API_KEY` and optionally `OPENAI_RESUME_MODEL` (default `gpt-4.1`) in the
backend environment. No client key is needed. No Redis worker is used by this pipeline.
The existing Railway `start` script runs migrations automatically. For local migrations:

```sh
yarn workspace @cvpro/backend migrate
```

Focused regression checks:

```sh
cd apps/backend
node --test services/__tests__/resumeGenerationService.test.mjs
node tests/resumeGeneration.integration.mjs
node tests/resumeExport.visual.mjs
```

These use mocked model responses to validate full-context requests, strict factual
review rejection, section isolation, all template renderers and DOCX round trips.
The export regression verifies that Projects begins in available Page 1 space,
continues on Page 2, reaches the minimum utilization target, retains full-height
sidebar styling, avoids clipping and matches the runtime/PDF page count. These tests
do not measure live AI writing quality. The separate UI smoke test exercises
upload, build, preview, design changes, edits, regeneration and export selection.

API input/output formats follow [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs)
and [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
