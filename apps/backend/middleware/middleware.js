import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { format, transports } from 'winston';

// ------------------------------------------------------------------------------------
// ✅ Morgan Middleware for HTTP Request Logging
// ------------------------------------------------------------------------------------
export const morganMiddleware = morgan('combined');

// ------------------------------------------------------------------------------------
// ✅ Helmet Middleware for Enhanced Security
// ------------------------------------------------------------------------------------
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,         // Allow inline styles & scripts if needed
  crossOriginEmbedderPolicy: false,     // Support for embedded media
  referrerPolicy: { policy: 'no-referrer' }, // Hide referrer details
  dnsPrefetchControl: { allow: true },  // Optimize DNS requests
});

// ------------------------------------------------------------------------------------
// ✅ Rate Limiting (Improved): per-user or per-IP, per-route budgets,
// dev-safe toggle, optional Redis store (dynamic import), Retry-After header.
// ------------------------------------------------------------------------------------
const isDev = process.env.NODE_ENV !== 'production';
const rateLimitEnabled = (process.env.RATE_LIMIT_ENABLED ?? 'true') !== 'false';

// Optional Redis store (recommended in prod if you run multiple instances).
// This block is safe: if the modules are not installed OR REDIS_URL is unset,
// it falls back to in-memory without crashing.
let rateLimitStore; // undefined by default => in-memory
if (process.env.REDIS_URL) {
  try {
    const { default: RedisStore } = await import('rate-limit-redis'); // dynamic import
    const { createClient } = await import('redis');
    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    rateLimitStore = new RedisStore({
      sendCommand: (...args) => redis.sendCommand(args),
    });
    
    console.log('[rate-limit] Using Redis store');
  } catch (e) {
   
    console.warn(
      '[rate-limit] Redis store unavailable; using in-memory store:',
      e && e.message ? e.message : e
    );
  }
}

// Prefer per-user key (if req.user set by auth), else IP
function keyFromReq(req) {
  const userId = (req.user && (req.user.id || req.user.user_id)) || null;
  return userId ? `u:${userId}` : `ip:${req.ip}`;
}

// Factory that returns a limiter middleware (disabled in dev by default)
function makeLimiter(opts) {
  const { windowMs, max, message = 'Too many requests, try again later.' } = opts || {};
  if (!rateLimitEnabled || isDev) {
    // No-op in development unless RATE_LIMIT_ENABLED=true
    return (_req, _res, next) => next();
  }
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,   // RateLimit-* headers
    legacyHeaders: false,
    keyGenerator: keyFromReq,
    store: rateLimitStore,   // undefined => in-memory
    handler: (req, res) => {
      const secs = Math.ceil(windowMs / 1000);
      res.set('Retry-After', String(secs));
      res.status(429).json({ message });
    },
  });
}

// ⬇️ Per-route limiters (mount in server.js)
//   app.use('/api/user',            userLimiter);
//   app.use('/api/reviews',         reviewsLimiter);
//   app.use('/api/course-progress', progressLimiter);
//   app.use('/api/certificates',    certificatesLimiter);
export const userLimiter         = makeLimiter({ windowMs: 60_000,  max: 60 });
export const reviewsLimiter      = makeLimiter({ windowMs: 60_000,  max: 120 }); // homepage fan-out
export const progressLimiter     = makeLimiter({ windowMs: 30_000,  max: 30  });
export const certificatesLimiter = makeLimiter({ windowMs: 30_000,  max: 20  });

// ⬇️ Backward-compatible global limiter (if something still imports { limiter })
export const limiter = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

// ------------------------------------------------------------------------------------
// ✅ Winston Logger Configuration
// ------------------------------------------------------------------------------------
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Timestamp formatting
  format.errors({ stack: true }),                      // Stack trace logging for errors
  format.splat(),
  format.json(),
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// ✅ Enable Console Logging in Non-Production Environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  );
}

// ------------------------------------------------------------------------------------
// ✅ Middleware to Log Errors to Winston Logger
// ------------------------------------------------------------------------------------
export const errorLogger = (err, _req, _res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  next(err); // Pass the error to the next middleware
};
