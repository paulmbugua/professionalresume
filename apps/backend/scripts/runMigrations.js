import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

process.env.SKIP_DB_STARTUP_PROBE = 'true';

const { default: pool } = await import('../config/db.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '..', 'migrations');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase({
  tries = Number(process.env.DB_MIGRATION_TRIES || process.env.DB_STARTUP_TRIES) || 12,
  backoffMs = Number(process.env.DB_MIGRATION_BACKOFF_MS || process.env.DB_STARTUP_BACKOFF_MS) || 1000,
} = {}) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      console.log('Database is ready for migrations.');
      return;
    } catch (error) {
      const isLast = attempt === tries;
      console.warn(
        'Waiting for database before migrations (attempt ' +
          attempt + '/' + tries + ') - ' + (error.code || error.message),
      );
      if (isLast) throw error;
      await sleep(backoffMs * Math.min(8, 2 ** (attempt - 1)));
    }
  }
}

async function run() {
  await waitForDatabase();

  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found.');
    return;
  }

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    console.log('Running migration: ' + file);
    await pool.query(sql);
  }

  console.log('Migrations completed successfully.');
}

run()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
