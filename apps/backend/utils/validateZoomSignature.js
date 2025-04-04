import crypto from 'crypto';

/**
 * Validate the Zoom webhook signature for security.
 * @param {Object} req - Express request object.
 * @throws {Error} If validation fails.
 */
export const validateZoomSignature = (req) => {
  try {
    const zoomSignature = req.headers['x-zm-signature'];
    const timestamp = req.headers['x-zm-request-timestamp'];
    const rawBody = req.rawBody; // Ensure middleware retains raw body

    if (!zoomSignature || !timestamp || !rawBody) {
      throw new Error('❌ Missing required Zoom headers or body.');
    }

    // ✅ Ensure timestamp is within 5 minutes to prevent replay attacks
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - timestamp) > 300) {
      throw new Error('⏳ Timestamp is too old. Possible replay attack.');
    }

    // ✅ Generate expected signature
    const message = `v0:${timestamp}:${rawBody}`;
    const expectedSignature = `v0=${crypto
      .createHmac('sha256', process.env.ZOOM_SECRET_TOKEN)
      .update(message)
      .digest('hex')}`;

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(zoomSignature, 'utf8');

    // ✅ Compare signatures securely (timing attack prevention)
    if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new Error('❌ Invalid Zoom webhook signature.');
    }

    console.log('✅ Zoom webhook signature validated successfully.');
  } catch (error) {
    console.error('🚨 Zoom Signature Validation Failed:', error.message);
    throw error;
  }
};
