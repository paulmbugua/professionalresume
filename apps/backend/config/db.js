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
  idleTimeoutMillis: 60000,       // Increase idle timeout (60 seconds)
  connectionTimeoutMillis: 5000,  // 5 seconds timeout for acquiring a connection
  keepAlive: true,                // Enable TCP keep-alive packets
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL Database Connected Successfully!');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL Connection Error:', err.message);
  // Instead of exiting immediately, you could log the error and let nodemon restart.
  // process.exit(1);
});

export default pool;
