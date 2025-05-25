// apps/backend/config/db.js

import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

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

pool.on('connect', () => {
  console.log('✅ PostgreSQL Database Connected Successfully!');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL idle client error:', err.message);
});

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


