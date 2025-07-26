// apps/backend/config/db.js
import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Determine the connection string
const connectionString = process.env.DATABASE_URL || (() => {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_NAME, DB_PORT } = process.env;
  return `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
})();


// Log a safe preview (without the password)
const safeConnLog = connectionString.replace(
  /:\/\/([^:]+):([^@]+)@/,
  '://$1:*****@'
);
console.log('Using Postgres connection:', safeConnLog);


const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_MAX_CONNECTIONS) || 50,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: true,
});

// Fired once for each new client that connects
pool.on('connect', () => {
  console.log('✅ PostgreSQL Database Connected Successfully!');
});

// Catches errors emitted by any idle client in the pool
pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL Idle Client Error:', err.message);
});

// Startup self-test: ensure we can actually run a query
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('🔍 Startup test query succeeded.');
  } catch (err) {
    console.error('🚨 Startup test query failed:', err);
    process.exit(1);
  }
})();

export default pool;
