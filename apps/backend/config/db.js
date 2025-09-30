// apps/backend/config/db.js
import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

// Build connection string (DATABASE_URL takes precedence)
const connectionString =
  process.env.DATABASE_URL ||
  (() => {
    const { DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT } = process.env;
    return `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  })();


  
  
// Log a safe preview (mask password)
const safeConnLog = connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:*****@');
console.log('Using Postgres connection:', safeConnLog);

// SSL (useful on managed hosts; stays false for localhost)
const wantSsl =
  process.env.PGSSL === 'require' ||
  /\bsslmode=require\b/i.test(connectionString) ||
  (!!process.env.DATABASE_URL && isProd);

const pool = new Pool({
  connectionString,
  ssl: wantSsl ? { rejectUnauthorized: false } : false,

  // Keep max sane; let PgBouncer or the DB handle larger fan-out
  max: Number(process.env.DB_MAX_CONNECTIONS) || (isProd ? 25 : 10),

  // Allow idle connections to stick around a bit to avoid churn during AI calls
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 300_000, // 5 min

  // Don’t wait forever to obtain a connection
  connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS) || 5_000,

  // TCP keepalives help detect dead peers on some networks/OSes
  keepAlive: true,
  keepAliveInitialDelayMillis: Number(process.env.DB_KEEPALIVE_DELAY_MS) || 10_000,

  // Optional: name shows up in pg_stat_activity
  application_name: process.env.PGAPPNAME || 'daybreak-backend',
});

// Pool signals
pool.on('connect', () => {
  console.log('✅ PostgreSQL client connected');
});

pool.on('remove', () => {
  // A client left the pool (closed). Usually normal.
});

pool.on('error', (err, client) => {
  // This fires for errors on *idle* clients. Log and continue;
  // the pool drops this client and will create a new one when needed.
  console.error('❌ Unexpected PG pool error (idle client):', err);
});

// ---- Robust startup: retry a few times before giving up (handy in dev/containers)
async function waitForPg({
  tries = Number(process.env.DB_STARTUP_TRIES) || 12,
  backoffMs = Number(process.env.DB_STARTUP_BACKOFF_MS) || 1000,
} = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('🔍 Startup test query succeeded.');
      return;
    } catch (err) {
      const last = i === tries - 1;
      console.warn(
        `⏳ Waiting for Postgres (attempt ${i + 1}/${tries}) — ${err.code || err.message}`
      );
      if (last) {
        console.error('🚨 Startup test query failed. Exiting.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, backoffMs * Math.min(8, 2 ** i)));
    }
  }
}
waitForPg().catch((e) => {
  console.error('🚨 PG init failed:', e);
  process.exit(1);
});

// ---- Small retry wrapper for transient connection errors
const RETRYABLE_PG_CODES = new Set([
  // server admin / crash / starting up
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '53300', // too_many_connections
  '08006', // connection_failure
  '08003', // connection_does_not_exist
]);

const RETRYABLE_NODE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
]);

/**
 * queryWithRetry(text, params?, opts?)
 * Retries on transient connection errors a couple times with backoff.
 */
export async function queryWithRetry(text, params = [], opts = {}) {
  const {
    retries = Number(process.env.DB_QUERY_RETRIES) || 2,
    minDelayMs = 150,
    maxDelayMs = 800,
  } = opts;

  let attempt = 0;
  for (;;) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      const msg = String(err?.message || '');
      const retryable =
        RETRYABLE_PG_CODES.has(err?.code) ||
        RETRYABLE_NODE_CODES.has(err?.code) ||
        /Connection terminated unexpectedly/i.test(msg);

      if (!retryable || attempt >= retries) {
        throw err;
      }

      const sleep =
        attempt === 0 ? minDelayMs : Math.min(maxDelayMs, minDelayMs * 2 ** attempt);
      attempt += 1;
      console.warn(
        `[pg:retry] ${err.code || err.name || 'error'} — retry ${attempt}/${retries} in ${sleep}ms`
      );
      await new Promise((r) => setTimeout(r, sleep));
    }
  }
}

// Optional: keep-alive ping (disabled by default). Enable with DB_PING_INTERVAL_MS=30000
const pingEveryMs = Number(process.env.DB_PING_INTERVAL_MS) || 0;
if (pingEveryMs > 0) {
  setInterval(async () => {
    try {
      await pool.query('SELECT 1');
    } catch (e) {
      console.warn('[pg:ping] failed:', e.code || e.message);
    }
  }, pingEveryMs).unref();
}

// Graceful shutdown to avoid noisy errors on reload/stop
for (const sig of ['SIGINT', 'SIGTERM', 'SIGQUIT']) {
  process.on(sig, async () => {
    try {
      await pool.end();
      console.log('🧹 PG pool closed');
    } catch (e) {
      console.warn('PG pool close error:', e?.message);
    } finally {
      process.exit(0);
    }
  });
}

export default pool;
