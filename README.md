

## AI Architecture

The product AI is integrated into the existing user workflows. The technical pipeline is intentionally invisible to end users:

Document ingestion -> parsing -> chunking -> embeddings -> PostgreSQL storage -> cosine retrieval -> grounded generation -> citations and quality checks.

For ProfessionalResume, retrieved profile evidence supports the CV Builder, job-description requirements are retrieved for ATS comparison, and CV plus job-description context grounds cover-letter generation. The workflow is coordinated by profile analysis, job analysis, CV planning, writing, quality review, and export steps.

For MyTutorApp, educational material is retrieved before Robot Teacher outlines, narrated lessons, and quizzes are generated. Resource searches can use semantic ranking, and learner-facing answers can cite the source passages used. The education workflow follows intent analysis, retrieval, lesson planning, quiz generation, safety/quality review, and narration/delivery.

Documents are chunked into manageable passages, embedded with the configured embedding model, and stored in PostgreSQL JSONB records for session-scoped retrieval. Generation is instructed to stay within retrieved evidence and expose simple source references where applicable. Evaluation tests cover chunking, cosine ranking, and citation behavior. Public AI endpoints use signed short-lived sessions, rate limits, consent checks, bounded input sizes, and never expose API keys.
