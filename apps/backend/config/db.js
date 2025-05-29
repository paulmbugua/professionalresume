// apps/backend/config/db.js

import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

console.log({
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: process.env.DB_PORT,
  DB_PASSWORD_SET: !!process.env.DB_PASSWORD,
});

const pool = new Pool({
  user:                   process.env.DB_USER,
  host:                   process.env.DB_HOST,
  database:               process.env.DB_NAME,
  password:               process.env.DB_PASSWORD,
  port:                   Number(process.env.DB_PORT),
  max:                    Number(process.env.DB_MAX_CONNECTIONS) || 50,
  idleTimeoutMillis:      60000,
  connectionTimeoutMillis: 5000,
  keepAlive:              true,
});

pool.on('connect', client => {
  console.log('✅ PostgreSQL Database Connected Successfully!');
  client.on('error', e => {
    console.error('⚠️ PostgreSQL client error after connect:', e.message);
  });
});

pool.on('error', err => {
  console.error('❌ Unexpected PostgreSQL idle client error:', err.message);
});

// Self-test on startup
(async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('🔍 Startup test query succeeded.');
  } catch (err) {
    console.error('🚨 Startup test query failed:', err);
    process.exit(1);
  }
})();

// Safely wrap connect() so it’s always bound to the pool and returns a client
const origConnect = pool.connect.bind(pool);
pool.connect = async function connect(...args) {
  const client = await origConnect(...args);
  client.on('error', err => {
    console.error('⚠️ PostgreSQL client error (ignored):', err.message);
  });
  return client;
};

export default pool;

