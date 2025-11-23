// apps/backend/utils/orgTierGuard.js
import pool from '../config/db.js';

const ORDER = ['starter', 'pro', 'enterprise'];

// Get the effective tier for an org based on org_subscriptions
export async function requireOrgTier(orgId) {
  const { rows } = await pool.query(
    `
    SELECT tier
    FROM org_subscriptions
    WHERE org_id = $1
      AND active = TRUE
    ORDER BY started_at DESC
    LIMIT 1
    `,
    [orgId]
  );

  if (!rows.length) {
    // No active subscription → treat as starter
    return 'starter';
  }

  let tier = String(rows[0].tier || 'starter').toLowerCase();
  if (!ORDER.includes(tier)) tier = 'starter';
  return tier;
}

// Check if current tier is at least required (e.g. pro / enterprise)
export function assertOrgTierAtLeast(currentTier, requiredTier) {
  const idx = ORDER.indexOf(currentTier);
  const reqIdx = ORDER.indexOf(requiredTier);

  if (idx === -1 || reqIdx === -1 || idx < reqIdx) {
    const err = new Error(`This feature requires ${requiredTier.toUpperCase()} plan or higher.`);
    err.status = 403;
    throw err;
  }
}
