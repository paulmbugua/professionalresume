// apps/backend/scripts/seedPackages.cjs
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const samplePackages = [
  { credits: 25,  price: 2,    offer: 'Basic Package'    },
  { credits: 151, price: 1499, offer: 'Standard Package' },
  { credits: 302, price: 2999, offer: 'Premium Package'  },
];

(async () => {
  const client = await pool.connect();
  try {
    console.log('Deleting existing packages…');
    await client.query('DELETE FROM packages');
    console.log('Inserting sample packages…');
    for (const { credits, price, offer } of samplePackages) {
      await client.query(
        'INSERT INTO packages (credits, price, offer) VALUES ($1, $2, $3)',
        [credits, price, offer]
      );
    }
    console.log('✅ Seeded packages.');
  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
