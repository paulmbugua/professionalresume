import { v2 as cloudinary } from 'cloudinary';
import fs from 'node:fs/promises';
import path from 'node:path';
import pool from '../config/db.js'; // adjust path to your db pool


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const ICONS = [
  { code: 'COURSE_STARTED',   file: 'course_started.svg'   },
  { code: 'FIRST_WEEK_DONE',  file: 'first_week_done.svg'  },
  { code: 'HALFWAY_THERE',    file: 'halfway_there.svg'    },
  { code: 'COURSE_COMPLETED', file: 'course_completed.svg' },
];

async function upsertRuleIcon(code, iconUrl) {
  await pool.query(
    `INSERT INTO badge_rules (code, title, icon_url, active)
     VALUES ($1, INITCAP(REPLACE($1, '_',' ')), $2, TRUE)
     ON CONFLICT (code) DO UPDATE SET icon_url = EXCLUDED.icon_url, active = TRUE`,
    [code, iconUrl]
  );
}

async function main() {
  const base = path.resolve('scripts/icons');
  for (const it of ICONS) {
    const file = path.join(base, it.file);
    await fs.access(file); // ensure exists

    const publicId = `achievements/${it.code.toLowerCase()}`;
    const { secure_url } = await cloudinary.uploader.upload(file, {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      type: 'upload',
      use_filename: false,
      unique_filename: false,
      folder: 'achievements'
    });

    await upsertRuleIcon(it.code, secure_url);
    console.log(`Seeded ${it.code}: ${secure_url}`);
  }
  console.log('Done.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
