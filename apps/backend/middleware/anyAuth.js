// apps/backend/middleware/anyAuth.js
import authUser from './authUser.js';
import requireAuth from './auth.js';

// Run an Express middleware "silently":
// - Use the real req
// - Use a mock res so it can't actually send
// - Resolve true if it called next() without error
// - Resolve false if it tried to send an error or didn't call next()
function runSilently(mw, req) {
  return new Promise((resolve) => {
    let nextCalled = false;
    let errored = false;
    let wrote = false;

    // minimal mock of res that captures writes but doesn't send them
    const mockRes = {
      statusCode: 200,
      headers: {},
      locals: {},

      status(code) { this.statusCode = code; return this; },
      set(field, value) { this.headers[field] = value; return this; },
      json(_body) { wrote = true; return this; },
      send(_body) { wrote = true; return this; },
      end(_body) { wrote = true; return this; },
    };

    const next = (err) => {
      if (err) { errored = true; }
      nextCalled = !err;
      resolve(nextCalled && !errored && !wrote);
    };

    try {
      mw(req, mockRes, next);
    } catch (_e) {
      resolve(false);
    }
  });
}

export default async function anyAuth(req, res, next) {
  // Try regular user auth first
  if (await runSilently(authUser, req)) return next();

  // Then try org auth
  if (await runSilently(requireAuth, req)) return next();

  // Neither accepted → deny
  return res.status(401).json({ message: 'Unauthorized' });
}
