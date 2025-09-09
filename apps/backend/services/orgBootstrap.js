// apps/backend/services/orgBootstrap.js
import pool from '../config/db.js';

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `org-${Math.random().toString(36).slice(2, 8)}`;

async function uniqueSlug(base) {
  let slug = slugify(base);
  let i = 1;
  while (true) {
    const { rows } = await pool.query('SELECT 1 FROM organizations WHERE slug=$1', [slug]);
    if (!rows.length) return slug;
    i += 1;
    slug = `${slugify(base)}-${i}`;
  }
}

export async function ensureOrgForUser(userId) {
  // Already in an org?
  const found = await pool.query(
    `SELECT o.*
       FROM organizations o
       JOIN org_memberships m ON m.org_id = o.id
      WHERE m.user_id = $1
      ORDER BY CASE WHEN m.role IN ('owner','admin') THEN 0 ELSE 1 END, o.created_at DESC
      LIMIT 1`,
    [userId]
  );
  if (found.rowCount) return found.rows[0];

  // Create a simple starter org and owner membership
  const ures = await pool.query('SELECT name, email FROM users WHERE id=$1', [userId]);
  if (!ures.rowCount) throw new Error('User not found');
  const { name, email } = ures.rows[0];

  // Title-case helper
  const toTitle = (s='') =>
    s.split(/[\s\-_]+/).map(w => w ? w[0].toUpperCase()+w.slice(1) : '').join(' ').trim();

  const domain = (email || '').split('@')[1]?.split('.')[0] || '';
  const looksLikeEmail = (name || '').includes('@');
  const base =
    !looksLikeEmail && name?.trim()
      ? name.trim()
      : (domain ? `${toTitle(domain)} Institute` : 'New Organization');
  const orgName = base.slice(0, 80);

  const slug = await uniqueSlug(orgName);

  const orgIns = await pool.query(
    `INSERT INTO organizations (owner_user_id, name, slug, created_at, updated_at)
     VALUES ($1,$2,$3,NOW(),NOW())
     RETURNING *`,
    [userId, orgName, slug]
  );

  await pool.query(
    `INSERT INTO org_memberships (org_id, user_id, role, invited_by, invited_at, joined_at)
     VALUES ($1,$2,'owner',$2,NOW(),NOW())
     ON CONFLICT (org_id, user_id) DO NOTHING`,
    [orgIns.rows[0].id, userId]
  );

  // Optional: give them a default subscription row
  await pool.query(
    `INSERT INTO org_subscriptions (org_id, tier, seats, active, created_at)
     VALUES ($1,'starter',50,TRUE,NOW())
     ON CONFLICT (org_id) DO NOTHING`,
    [orgIns.rows[0].id]
  );

  return orgIns.rows[0];
}
