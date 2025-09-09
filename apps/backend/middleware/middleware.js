// apps/backend/middleware/middleware.js  (or update server.js import to './middleware.js')
import morgan from 'morgan';
import helmet from 'helmet';
import winston, { format, transports } from 'winston';
import { redis } from '../utils/redisCache.js';

/* ────────────────────────────────────────────────────────
 * HTTP logging
 * ──────────────────────────────────────────────────────── */
export const morganMiddleware = morgan('combined');

/* ────────────────────────────────────────────────────────
 * Security headers
 * ──────────────────────────────────────────────────────── */
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
  dnsPrefetchControl: { allow: true },
});

/* ────────────────────────────────────────────────────────
 * Rate limiting (Redis sliding window, in-memory fallback)
 * Dev default: OFF unless RATE_LIMIT_ENABLED="true"
 * Prod default: ON
 * ──────────────────────────────────────────────────────── */
const isDev = process.env.NODE_ENV !== 'production';

// Default OFF in dev, ON in prod
const rateLimitEnv = process.env.RATE_LIMIT_ENABLED ?? (isDev ? 'false' : 'true');
const rateLimitEnabled = rateLimitEnv === 'true';

function shouldBypass(req) {
  if (!rateLimitEnabled) return true;              // globally off (e.g. dev)
  if (req.method === 'OPTIONS') return true;       // preflight
  if (req.path === '/healthz') return true;        // health checks
  return false;
}

function defaultKeyFn(req) {
  const user = req.user || {};
  const uid = user.id || user.user_id || null;
  return uid ? `u:${uid}` : `ip:${req.ip}`;
}

// In-memory fixed window fallback
const memBuckets = new Map(); // key -> { count, resetAt }
function memoryLimiter({ windowMs, limit, message = 'Too many requests, try again later.', keyFn = defaultKeyFn }) {
  return (req, res, next) => {
    if (shouldBypass(req)) return next();

    const key = keyFn(req);
    const now = Date.now();
    const bucket = memBuckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    memBuckets.set(key, bucket);

    const remaining = Math.max(0, limit - bucket.count);
    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > limit) {
      const secs = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(secs));
      return res.status(429).json({ message });
    }
    next();
  };
}

// Redis sliding window limiter (sorted set per key)
function redisSlidingWindowLimiter({
  windowMs,
  limit,
  message = 'Too many requests, try again later.',
  keyFn = defaultKeyFn,
}) {
  return async (req, res, next) => {
    if (shouldBypass(req)) return next();

    if (!redis) return memoryLimiter({ windowMs, limit, message, keyFn })(req, res, next);

    const key = `rl:${keyFn(req)}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.multi()
        .zremrangebyscore(key, 0, windowStart)
        .zadd(key, now, `${now}-${Math.random()}`)
        .zcard(key)
        .pexpire(key, windowMs);

      const results = await pipeline.exec();
      const count = Number(results?.[2]?.[1] ?? 0);
      const remaining = Math.max(0, limit - count);

      res.setHeader('RateLimit-Limit', String(limit));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(Math.ceil((windowStart + windowMs) / 1000)));

      if (count > limit) {
        const secs = Math.max(1, Math.ceil(windowMs / 1000));
        res.setHeader('Retry-After', String(secs));
        return res.status(429).json({ message });
      }
      next();
    } catch (e) {
      console.warn('[rate-limit] Redis error, falling back to memory:', e?.message || e);
      return memoryLimiter({ windowMs, limit, message, keyFn })(req, res, next);
    }
  };
}

function makeLimiter(opts) {
  return redisSlidingWindowLimiter(opts);
}

/* ────────────────────────────────────────────────────────
 * Enhanced keying for AI endpoints
 * ──────────────────────────────────────────────────────── */
// Extract a best-effort user id from Authorization: Bearer <jwt> without verifying
function extractUidFromAuth(req) {
  try {
    const h = req.headers?.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadB64 = parts[1];
    const json = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return payload.sub || payload.uid || payload.user_id || payload.id || null;
  } catch {
    return null;
  }
}

// Smarter AI limiter key: per route-bucket + per user (fallback IP)
function aiKeyFn(req) {
  const path = String(req.path || '');
  let bucket = 'ai';
  if (path.includes('outline')) bucket = 'ai:outline';
  else if (path.includes('lesson') || path.includes('ssml')) bucket = 'ai:lesson';
  else if (path.includes('quiz')) bucket = 'ai:quiz';
  else if (path.includes('ttsAvatar')) bucket = 'ai:tts';

  const uid = (req.user && (req.user.id || req.user.user_id)) || extractUidFromAuth(req);
  const id = uid ? `u:${uid}` : `ip:${req.ip}`;
  return `${bucket}:${id}`;
}

/* ────────────────────────────────────────────────────────
 * Exports (same names) + strict AI limiter
 * ──────────────────────────────────────────────────────── */
export const userLimiter         = makeLimiter({ windowMs: 60_000,  limit: isDev ? 1000 : 60  });
export const reviewsLimiter      = makeLimiter({ windowMs: 60_000,  limit: isDev ? 2000 : 120 });
export const progressLimiter     = makeLimiter({ windowMs: 30_000,  limit: isDev ? 1000 : 30  });
export const certificatesLimiter = makeLimiter({ windowMs: 30_000,  limit: isDev ? 1000 : 20  });

// Mild global guard
export const limiter = makeLimiter({
  windowMs: 15 * 60_000,
  limit: isDev ? 10_000 : 100,
  message: 'Too many requests from this client, please try again after 15 minutes.',
});

// Legacy simple AI limiter (kept for backward compatibility if anything else imports it)
export const aiLimiter = makeLimiter({ windowMs: 60_000, limit: isDev ? 200 : 10 });

// New: STRICT (but fair) per-user, per-bucket AI limiter
export const aiLimiterStrict = makeLimiter({
  windowMs: 60_000,
  limit: isDev ? 200 : 60,     // 60 req/user/min spread across buckets
  keyFn: aiKeyFn,
  message: 'Too many AI requests, slow down briefly.',
});

/* ────────────────────────────────────────────────────────
 * Winston logger
 * ──────────────────────────────────────────────────────── */
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
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

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({ format: format.combine(format.colorize(), format.simple()) }));
}

/* ────────────────────────────────────────────────────────
 * Error logger middleware
 * ──────────────────────────────────────────────────────── */
export const errorLogger = (err, _req, _res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  next(err);
};
