// apps/backend/workers/webhookWorker.js
import fetch from 'node-fetch';
import crypto from 'crypto';
import pool from '../config/db.js';

function sign(secret, ts, raw) {
  const h = crypto.createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
  return `t=${ts},v1=${h}`;
}

async function nextBatch(limit = 15) {
  const { rows } = await pool.query(
    `SELECT d.id, d.org_id, d.event_type, d.payload::text AS body,
            o.webhook_url, o.webhook_secret
       FROM org_webhook_deliveries d
       JOIN organizations o ON o.id = d.org_id
      WHERE d.status = 'pending'
      ORDER BY d.created_at ASC
      LIMIT $1`,
    [limit]
  );
  return rows;
}

async function mark(id, status, last_error = null) {
  const sets = ['status = $1', 'attempt_count = attempt_count + 1'];
  const vals = [status];
  if (status === 'ok') sets.push('delivered_at = now()');
  if (last_error !== null) { sets.push('last_error = $2'); vals.push(String(last_error).slice(0, 500)); }
  await pool.query(
    `UPDATE org_webhook_deliveries SET ${sets.join(', ')} WHERE id = $${vals.length + 1}`,
    [...vals, id]
  );
}

export async function runWebhookTick() {
  const batch = await nextBatch(15);
  for (const j of batch) {
    try {
      const ts = Math.floor(Date.now() / 1000);
      const sig = sign(j.webhook_secret, ts, j.body);
      const resp = await fetch(j.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DayBreak-Hook/1.0',
          'X-DayBreak-Event': j.event_type,
          'X-DayBreak-Signature': sig,
          'X-DayBreak-Timestamp': String(ts),
        },
        body: j.body,
        timeout: 10_000,
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      await mark(j.id, 'ok');
    } catch (e) {
      await mark(j.id, 'pending', e?.message || String(e));
      await pool.query(
        `UPDATE org_webhook_deliveries
            SET created_at = now() + make_interval(mins := LEAST(5, GREATEST(1, attempt_count)))
          WHERE id = $1`,
        [j.id]
      );
    }
  }
}
