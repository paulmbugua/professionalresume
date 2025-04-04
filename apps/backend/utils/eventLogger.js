import pkg from 'pg';

const { Pool } = pkg;

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
});

/**
 * ✅ Logs Zoom webhook events in PostgreSQL.
 * @param {string} event - The Zoom event name (e.g., "meeting.started").
 * @param {object} payload - The event payload.
 * @param {object} rawPayload - The full raw payload received from Zoom.
 * @param {string} customEvent - Custom event name (default: same as `event`).
 */
export const logZoomEvent = async (
  event,
  payload,
  rawPayload,
  customEvent = event,
) => {
  try {
    console.log(`Logging event: ${customEvent}`);

    // Extract meetingId safely from the payload
    const meetingId = payload?.object?.id || null;

    // Store event in PostgreSQL
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO zoom_webhooks (event, meeting_id, raw_payload, timestamp)
         VALUES ($1, $2, $3, NOW())`,
        [customEvent, meetingId, JSON.stringify(rawPayload)],
      );
    } finally {
      client.release();
    }

    console.log(`✅ Logged event successfully: ${customEvent}`);
  } catch (error) {
    console.error('❌ Error logging Zoom event:', error.message || error);
  }
};
