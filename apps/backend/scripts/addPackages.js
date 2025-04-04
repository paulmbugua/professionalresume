import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

console.log('POSTGRES_URI:', process.env.POSTGRES_URI);

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI, // Ensure POSTGRES_URI is set in .env
});

// Sample Package Data
const samplePackages = [
  { credits: 25, price: 2, offer: 'Basic Package' },
  { credits: 151, price: 1499, offer: 'Standard Package' },
  { credits: 302, price: 2999, offer: 'Premium Package' },
];

// Seed Function
const seedPackages = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL');

    // Clear existing packages
    await client.query('DELETE FROM packages');
    console.log('Deleted existing packages.');

    // Insert new packages
    const insertQuery =
      'INSERT INTO packages (credits, price, offer) VALUES ($1, $2, $3)';
    for (const { credits, price, offer } of samplePackages) {
      await client.query(insertQuery, [credits, price, offer]);
    }

    console.log(`Inserted ${samplePackages.length} new packages.`);
  } catch (error) {
    console.error('Error seeding packages:', error);
  } finally {
    client.release(); // Release connection
    console.log('Disconnected from PostgreSQL');
  }
};

// Execute the script
seedPackages();
