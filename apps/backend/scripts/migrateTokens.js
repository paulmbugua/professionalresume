import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Ensure DATABASE_URL is set in .env
});

// Migrate Tokens Function
const migrateTokens = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL.');

    // Update tokens for all users, setting tokens to 0
    const result = await client.query('UPDATE users SET tokens = 0');

    console.log(
      `Tokens initialized for all users. Modified rows: ${result.rowCount}`,
    );
  } catch (error) {
    console.error('Error during migration:', error.message || error);
  } finally {
    client.release(); // Release connection
    console.log('Disconnected from PostgreSQL');
  }
};

// Execute the script
migrateTokens();
