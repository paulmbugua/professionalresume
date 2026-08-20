# AI Lab architecture

The public `/ai-lab` route demonstrates the production career-AI workflow: consented document processing, bounded chunking, server-side embeddings, PostgreSQL retrieval, grounded writing, citations, and quality review.

The backend issues short-lived signed sessions, rate limits public calls, expires indexed content, and never exposes provider credentials. Career stages are represented as profile analyst, job-description analyst, CV planner, writing agent, quality review, and export service.

Evaluation: run `node --test apps/backend/tests/aiLab.eval.mjs` from the repository root.
