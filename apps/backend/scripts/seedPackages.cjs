// apps/backend/scripts/seedPackages.cjs
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ---- FX + helpers ----
const TOKEN_TO_USD = Number(process.env.TOKEN_TO_USD ?? 1);     // 1 token = $1
const USD_TO_KES   = Number(process.env.USD_TO_KES ?? 133.75);  // $1 = KES 130.25

// Nice rounding for KES price tags (to nearest 10)
const roundKES = (n) => Math.round(n / 10) * 10;

// Discount ladder (skip 5 credits, start at 20+)
function discountPctForCredits(credits) {
  if (credits < 10) return 0.00;       // keep Starter Pack (5 credits) full price
  if (credits >= 200) return 0.12;     // 12%
  if (credits >= 100) return 0.10;     // 10%
  if (credits >= 50)  return 0.08;     // 8%
  if (credits >= 25)  return 0.06;     // 6%
  if (credits >= 10)  return 0.04;     // 4%
  return 0.00;
}

// ---- Package blueprint ----
const BLUEPRINT = [
  { credits: 5,    offer: 'Starter Pack'   }, // always 1:1
  { credits: 20,   offer: 'Basic Pack'     },
  { credits: 50,   offer: 'Standard Pack'  },
  { credits: 100,  offer: 'Premium Pack'   },
  { credits: 250,  offer: 'Pro Pack'       },
];

// Compute USD packages with discounts applied
function buildUSDPackages(blueprint) {
  return blueprint.map(({ credits, offer }) => {
    const baseUSD = credits * TOKEN_TO_USD;
    const disc = discountPctForCredits(credits);
    const priceUSD = +(baseUSD * (1 - disc)).toFixed(2);
    return { credits, price: priceUSD, currency: 'USD', offer };
  });
}

// Derive KES from discounted USD price
function buildKESPackages(usdPackages) {
  return usdPackages.map(({ credits, price, offer }) => {
    const kes = roundKES(price * USD_TO_KES);
    return { credits, price: kes, currency: 'KES', offer };
  });
}

const packagesUSD = buildUSDPackages(BLUEPRINT);
const packagesKES = buildKESPackages(packagesUSD);

// Final seed set
const packagesToSeed = [...packagesUSD, ...packagesKES];

(async () => {
  const client = await pool.connect();
  try {
    console.log('Ensuring packages table has `currency` column…');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name='packages' AND column_name='currency'
        ) THEN
          ALTER TABLE packages ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
        END IF;
      END$$;
    `);

    console.log('Deleting existing packages…');
    await client.query('DELETE FROM packages');

    console.log('Inserting USD & KES packages (with tiered discounts)…');
    for (const { credits, price, currency, offer } of packagesToSeed) {
      await client.query(
        'INSERT INTO packages (credits, price, currency, offer) VALUES ($1, $2, $3, $4)',
        [credits, price, currency, offer]
      );
    }

    const { rows } = await client.query(
      'SELECT id, credits, price, currency, offer FROM packages ORDER BY currency, credits'
    );
    console.table(rows);
    console.log(
      `✅ Done seeding packages. Peg: 1 token = $${TOKEN_TO_USD}. FX: $1 = KES ${USD_TO_KES}. Discounts apply for 10+ credits.`
    );
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
