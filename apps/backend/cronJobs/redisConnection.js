// apps/backend/cronJobs/redisConnection.js
import IORedis from 'ioredis';

export function createRedis() {
  const url = process.env.REDIS_URL;
  if (url) {
    return new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,         // don't connect until we say so
      connectTimeout: 2000,
    });
  }
  return new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined, // optional
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined, // optional for rediss
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 2000,
});

}
