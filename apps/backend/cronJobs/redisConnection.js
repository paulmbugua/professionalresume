// apps/backend/cronJobs/redisConnection.js
import IORedis from 'ioredis';

export function createRedis() {
  if (process.env.DISABLE_REDIS === 'true') {
    console.warn('[redis] Disabled via DISABLE_REDIS=true');
    return null;
  }

  const common = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 3000,
    retryStrategy: (times) => Math.min(times * 250, 3000),
  };

  const url = process.env.REDIS_URL;
  if (url) {
    const redis = new IORedis(url, common); // rediss:// enables TLS automatically
    redis.on('error', (error) => {
      console.warn(
        '[redis] connection error; caching disabled until Redis is reachable',
        error?.message || error,
      );
    });
    return redis;
  }

  const hasExplicitLocalConfig = Boolean(
    process.env.REDIS_HOST || process.env.REDIS_PORT || process.env.REDIS_PASSWORD,
  );
  const allowLocalFallback =
    process.env.REDIS_LOCAL_FALLBACK === 'true' || process.env.NODE_ENV !== 'production';

  if (!hasExplicitLocalConfig && !allowLocalFallback) {
    console.warn('[redis] REDIS_URL is not configured; caching disabled.');
    return null;
  }

  // Fallback (local dev / docker compose only)
  const redis = new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    ...common,
  });
  redis.on('error', (error) => {
    console.warn(
      '[redis] connection error; caching disabled until Redis is reachable',
      error?.message || error,
    );
  });
  return redis;
}

// optional helper you can call from your server bootstrap
export async function ensureRedisConnected(redis) {
  if (!redis) return false;
  if (redis.status === 'wait') {
    await redis.connect();
  }
  return true;
}
