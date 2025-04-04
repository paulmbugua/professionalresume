import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI, // Ensure POSTGRES_URI is set in .env
});

// Session Types Data
const sessionDurations = [
  { type: 'privateSession', duration: 60 },
  { type: 'groupSession', duration: 90 },
  { type: 'lecture', duration: 120 },
  { type: 'workshop', duration: 180 },
];

// Seed Function
const seedSessionDurations = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL.');

    // Delete existing session types
    await client.query('DELETE FROM session_types');
    console.log('Deleted existing session types.');

    // Insert new session types
    const insertQuery = `INSERT INTO session_types (type, duration) VALUES ($1, $2)`;

    for (const session of sessionDurations) {
      await client.query(insertQuery, [session.type, session.duration]);
    }

    console.log(`Inserted ${sessionDurations.length} new session types.`);
  } catch (error) {
    console.error('Error seeding session durations:', error.message || error);
  } finally {
    client.release(); // Release connection
    console.log('Disconnected from PostgreSQL');
  }
};

// Execute the script
seedSessionDurations();
