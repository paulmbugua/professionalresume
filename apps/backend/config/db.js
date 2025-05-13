import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  // Set the maximum number of connections in the pool.
  max: Number(process.env.DB_MAX_CONNECTIONS) || 20,
  // Increase idle timeout to 60 seconds (if a connection is idle, it will be closed after 60s)
  idleTimeoutMillis: 60000,
  // Timeout for acquiring a new connection (in milliseconds)
  connectionTimeoutMillis: 5000,
  // Enable TCP keep-alive packets
  keepAlive: true,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL Database Connected Successfully!');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL Connection Error:', err.message);
});

export default pool;
