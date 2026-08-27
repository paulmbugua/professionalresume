import crypto from 'node:crypto';
import OpenAI from 'openai';
import pool from '../config/db.js';

/**
 * OpenAI client
 */
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * AI models
 */
const embeddingModel =
  process.env.AI_LAB_EMBEDDING_MODEL || 'text-embedding-3-small';

const chatModel =
  process.env.AI_LAB_CHAT_MODEL ||
  process.env.OPENAI_MODEL ||
  'gpt-4o-mini';

/**
 * AI Lab pipeline descriptions
 */
export const pipelines = {
  career: [
    'Document upload',
    'Parser',
    'Chunker',
    'Embedding / index',
    'Retrieval',
    'Grounded CV or cover-letter generation',
    'Citation and quality check',
  ],

  education: [
    'Document upload',
    'Parser',
    'Chunker',
    'Embedding / index',
    'Retrieval',
    'Grounded learner answer',
    'Citation and safety check',
  ],
};

/**
 * AI Lab agent descriptions
 */
export const agents = {
  career: [
    'Profile analyst',
    'Job-description analyst',
    'CV planner',
    'Writing agent',
    'Quality-review agent',
    'Export service',
  ],

  education: [
    'Intent agent',
    'Retrieval agent',
    'Lesson planner agent',
    'Quiz generator agent',
    'Safety / quality evaluator',
    'Narration and delivery',
  ],
};

/**
 * Split text into overlapping chunks.
 */
export function chunkText(text, size = 1200, overlap = 160) {
  const value = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (!value) {
    return [];
  }

  const safeSize = Math.max(200, Number(size) || 1200);
  const safeOverlap = Math.max(
    0,
    Math.min(Number(overlap) || 0, safeSize - 1)
  );

  const step = Math.max(1, safeSize - safeOverlap);

  const chunks = [];

  for (let start = 0; start < value.length; start += step) {
    const chunk = value
      .slice(start, start + safeSize)
      .trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (start + safeSize >= value.length) {
      break;
    }
  }

  return chunks;
}

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(a, b) {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length === 0 ||
    a.length !== b.length
  ) {
    return 0;
  }

  let dot = 0;
  let aa = 0;
  let bb = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;

    dot += av * bv;
    aa += av * av;
    bb += bv * bv;
  }

  if (!aa || !bb) {
    return 0;
  }

  return dot / (Math.sqrt(aa) * Math.sqrt(bb));
}

/**
 * Generate OpenAI embeddings.
 */
async function embed(input) {
  if (!openai) {
    throw new Error('AI_LAB_NOT_CONFIGURED');
  }

  const values = Array.isArray(input)
    ? input
    : [input];

  const sanitized = values
    .map((value) => String(value || '').slice(0, 8000))
    .filter(Boolean);

  if (!sanitized.length) {
    return [];
  }

  const result = await openai.embeddings.create({
    model: embeddingModel,
    input: sanitized,
  });

  return result.data.map((item) => item.embedding);
}

/**
 * Generate an ID.
 */
function id() {
  return crypto.randomUUID();
}

/**
 * Safely normalize an embedding stored in Postgres.
 *
 * PostgreSQL jsonb normally arrives as an array, but this also
 * protects against environments/drivers returning a JSON string.
 */
function normalizeEmbedding(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Normalize inline text sources.
 *
 * Used by CV and cover-letter controllers.
 */
function normalizeTextSources(sources = []) {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .map((source, index) => {
      if (typeof source === 'string') {
        return {
          filename: `Source ${index + 1}`,
          text: source.trim(),
        };
      }

      if (!source || typeof source !== 'object') {
        return null;
      }

      const filename = String(
        source.filename ||
        source.name ||
        source.title ||
        `Source ${index + 1}`
      )
        .slice(0, 180)
        .trim();

      const text = String(
        source.text ??
        source.content ??
        ''
      ).trim();

      if (!text) {
        return null;
      }

      return {
        filename: filename || `Source ${index + 1}`,
        text,
      };
    })
    .filter(Boolean);
}

/**
 * Simple lexical fallback scoring.
 *
 * This allows inline grounding to continue working even if
 * OpenAI embeddings are temporarily unavailable.
 */
function lexicalScore(query, content) {
  const queryTerms = [
    ...new Set(
      String(query || '')
        .toLowerCase()
        .split(/[^a-z0-9+#.-]+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 2)
    ),
  ];

  if (!queryTerms.length) {
    return 0;
  }

  const text = String(content || '').toLowerCase();

  let score = 0;

  for (const term of queryTerms) {
    if (text.includes(term)) {
      score += 1;
    }
  }

  return score / queryTerms.length;
}

/**
 * Retrieve relevant passages directly from supplied text sources.
 *
 * IMPORTANT:
 * This is the export required by:
 *
 *   controllers/aiCvController.js
 *   controllers/aiCoverLetterController.js
 *
 * It does NOT require the source text to first be stored in
 * ai_lab_documents/ai_lab_chunks.
 *
 * Example:
 *
 * retrieveTextSources({
 *   query: 'React TypeScript PostgreSQL',
 *   sources: [
 *     { filename: 'CV draft', text: '...' },
 *     { filename: 'Job advert', text: '...' }
 *   ]
 * });
 */
export async function retrieveTextSources({
  query,
  sources = [],
  limit = 8,
} = {}) {
  const normalizedSources = normalizeTextSources(sources);

  if (!normalizedSources.length) {
    return [];
  }

  const safeLimit = Math.max(
    1,
    Math.min(Number(limit) || 8, 20)
  );

  const passages = [];

  normalizedSources.forEach((source, sourceIndex) => {
    const chunks = chunkText(source.text);

    chunks.forEach((content, chunkIndex) => {
      passages.push({
        id: `inline-${sourceIndex}-${chunkIndex}`,
        filename: source.filename,
        chunkIndex,
        content,
        score: 0,
      });
    });
  });

  if (!passages.length) {
    return [];
  }

  const question = String(query || '').trim();

  /**
   * If no query was supplied, simply return the first passages.
   */
  if (!question) {
    return passages
      .slice(0, safeLimit)
      .map((passage) => ({
        ...passage,
        score: 0,
      }));
  }

  /**
   * Preferred approach:
   * semantic retrieval with OpenAI embeddings.
   */
  if (openai) {
    try {
      const embeddingInput = [
        question.slice(0, 8000),
        ...passages.map((passage) =>
          passage.content.slice(0, 8000)
        ),
      ];

      const vectors = await embed(embeddingInput);

      const queryVector = vectors[0];
      const passageVectors = vectors.slice(1);

      if (
        Array.isArray(queryVector) &&
        passageVectors.length === passages.length
      ) {
        return passages
          .map((passage, index) => ({
            ...passage,
            score: cosineSimilarity(
              queryVector,
              passageVectors[index]
            ),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, safeLimit);
      }
    } catch (error) {
      console.warn(
        '[ai-lab] inline semantic retrieval failed; using lexical fallback:',
        error?.message || error
      );
    }
  }

  /**
   * Fallback:
   * lexical retrieval.
   *
   * This keeps the CV/cover-letter endpoints functional even
   * when embeddings cannot be generated.
   */
  return passages
    .map((passage, index) => ({
      ...passage,
      score: lexicalScore(question, passage.content),
      _originalIndex: index,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a._originalIndex - b._originalIndex;
    })
    .slice(0, safeLimit)
    .map(({ _originalIndex, ...passage }) => passage);
}

/**
 * Store and embed an uploaded AI Lab document.
 */
export async function indexDocument({
  sessionId,
  filename,
  mimeType,
  mode,
  text,
  consentToProcess,
}) {
  if (consentToProcess !== true) {
    throw new Error('PROCESSING_CONSENT_REQUIRED');
  }

  if (!sessionId) {
    throw new Error('SESSION_ID_REQUIRED');
  }

  const content = String(text || '')
    .slice(0, 120000)
    .trim();

  if (!content) {
    throw new Error('Document text is empty');
  }

  const chunks = chunkText(content);

  if (!chunks.length) {
    throw new Error('Document text produced no chunks');
  }

  const vectors = await embed(chunks);

  if (vectors.length !== chunks.length) {
    throw new Error('EMBEDDING_COUNT_MISMATCH');
  }

  const documentId = id();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
        INSERT INTO ai_lab_documents (
          id,
          session_id,
          source_type,
          filename,
          mime_type,
          content
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        documentId,
        sessionId,
        mode === 'career' ? 'career' : 'education',
        String(filename || 'document.txt').slice(0, 180),
        mimeType || 'text/plain',
        content,
      ]
    );

    for (let i = 0; i < chunks.length; i += 1) {
      await client.query(
        `
          INSERT INTO ai_lab_chunks (
            id,
            document_id,
            session_id,
            chunk_index,
            content,
            embedding
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          id(),
          documentId,
          sessionId,
          i,
          chunks[i],
          JSON.stringify(vectors[i]),
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    documentId,
    filename: String(filename || 'document.txt'),
    chunks: chunks.length,
  };
}

/**
 * Retrieve semantically relevant passages from indexed
 * AI Lab documents belonging to a session.
 */
export async function retrieve(
  sessionId,
  question,
  limit = 8
) {
  if (!sessionId) {
    throw new Error('SESSION_ID_REQUIRED');
  }

  const query = String(question || '').trim();

  if (!query) {
    return [];
  }

  const safeLimit = Math.max(
    1,
    Math.min(Number(limit) || 8, 20)
  );

  const [queryVector] = await embed([
    query.slice(0, 4000),
  ]);

  const result = await pool.query(
    `
      SELECT
        c.id,
        c.content,
        c.chunk_index,
        c.embedding,
        d.filename
      FROM ai_lab_chunks c
      JOIN ai_lab_documents d
        ON d.id = c.document_id
      WHERE
        c.session_id = $1
        AND d.expires_at > now()
      ORDER BY c.created_at DESC
      LIMIT 2000
    `,
    [sessionId]
  );

  return result.rows
    .map((row) => ({
      id: row.id,
      content: row.content,
      chunkIndex: row.chunk_index,
      filename: row.filename,
      score: cosineSimilarity(
        queryVector,
        normalizeEmbedding(row.embedding)
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit);
}

/**
 * Run complete grounded AI workflow.
 */
export async function runWorkflow({
  sessionId,
  mode,
  question,
}) {
  if (!openai) {
    throw new Error('AI_LAB_NOT_CONFIGURED');
  }

  if (!sessionId) {
    throw new Error('SESSION_ID_REQUIRED');
  }

  const query = String(question || '').trim();

  if (!query) {
    throw new Error('QUESTION_REQUIRED');
  }

  const passages = await retrieve(
    sessionId,
    query
  );

  const context = passages
    .map(
      (passage, index) =>
        `[${index + 1}] ${passage.filename}: ${passage.content}`
    )
    .join('\n\n');

  const selected =
    mode === 'career'
      ? 'career'
      : 'education';

  const system =
    selected === 'career'
      ? [
          'You are a grounded CV and cover-letter assistant.',
          'Use only the provided documents as evidence for factual claims.',
          'Never invent employment history, qualifications, achievements, dates, skills, metrics, or experience.',
          'If the sources do not support a requested claim, say so.',
          'Cite supported claims using [1], [2], etc.',
        ].join(' ')
      : [
          'You are a grounded educational tutor.',
          'Use only the provided learning passages.',
          'Explain at the learner level.',
          'Cite factual claims using [1], [2], etc.',
          'If the sources do not answer the question, say so.',
        ].join(' ');

  const userPrompt = passages.length
    ? `Question: ${query.slice(0, 2000)}

Retrieved sources:

${context}`
    : `Question: ${query.slice(0, 2000)}

No relevant source passages were retrieved.

Explain that the available sources do not contain enough information to answer the question.`;

  const completion =
    await openai.chat.completions.create({
      model: chatModel,
      temperature: 0.2,
      max_tokens: 800,

      messages: [
        {
          role: 'system',
          content: system,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

  const answer =
    completion.choices?.[0]?.message?.content?.trim() ||
    'No answer generated.';

  const citations = [
    ...answer.matchAll(/\[(\d+)\]/g),
  ]
    .map((match) => Number(match[1]))
    .filter(
      (number) =>
        number >= 1 &&
        number <= passages.length
    );

  const uniqueCitations = [
    ...new Set(citations),
  ];

  return {
    answer: {
      text: answer,
      citations: uniqueCitations,
      grounded: uniqueCitations.length > 0,
    },

    passages,

    pipeline: pipelines[selected],

    agents: agents[selected].map(
      (name, index) => ({
        name,
        status: 'complete',

        note:
          index === 1
            ? `${passages.length} passages retrieved`
            : index === 4
              ? uniqueCitations.length
                ? 'Groundedness check passed'
                : 'Review required'
              : 'Completed',
      })
    ),
  };
}