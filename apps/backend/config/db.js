// apps/backend/config/db.js

import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// log out what we’re using, to catch config mistakes early
console.log({
  DB_USER:         process.env.DB_USER,
  DB_HOST:         process.env.DB_HOST,
  DB_NAME:         process.env.DB_NAME,
  DB_PORT:         process.env.DB_PORT,
  DB_PASSWORD_SET: !!process.env.DB_PASSWORD,
})

const pool = new Pool({
  user:                   process.env.DB_USER,
  host:                   process.env.DB_HOST,
  database:               process.env.DB_NAME,
  password:               process.env.DB_PASSWORD,
  port:                   Number(process.env.DB_PORT),
  max:                    Number(process.env.DB_MAX_CONNECTIONS) || 50,
  idleTimeoutMillis:      60_000,
  connectionTimeoutMillis: 5_000,
  keepAlive:              true,
})

// Fired once for each new client that connects
pool.on('connect', () => {
  console.log('✅ PostgreSQL Database Connected Successfully!')
})

// Catches errors emitted by any idle client in the pool
pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL Idle Client Error:', err.message)
})

// Startup self-test: ensure we can actually run a query
;(async () => {
  try {
    await pool.query('SELECT 1')
    console.log('🔍 Startup test query succeeded.')
  } catch (err) {
    console.error('🚨 Startup test query failed:', err)
    process.exit(1)
  }
})()

export default pool
