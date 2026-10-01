import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (redisUrl && redisToken && !redisUrl.includes('your-redis-instance')) {
  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (err) {
    console.warn('[Redis] Failed to initialize Upstash Redis client:', err);
  }
} else {
  console.warn('[Redis] Upstash Redis credentials not configured. Using in-memory fallback.');
}

// In-memory fallback map if Redis is not reachable
const inMemoryCache = new Map<string, { value: any; expiresAt: number }>();

export async function getCache<T>(key: string): Promise<T | null> {
  if (redisClient) {
    try {
      const data = await redisClient.get<T>(key);
      return data;
    } catch (err) {
      console.warn(`[Redis Error] get(${key}):`, err);
    }
  }

  // Fallback
  const cached = inMemoryCache.get(key);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      inMemoryCache.delete(key);
      return null;
    }
    return cached.value as T;
  }
  return null;
}

export async function setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.set(key, value, { ex: ttlSeconds });
      return;
    } catch (err) {
      console.warn(`[Redis Error] set(${key}):`, err);
    }
  }

  // Fallback
  inMemoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function delCache(key: string): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.warn(`[Redis Error] del(${key}):`, err);
    }
  }
  inMemoryCache.delete(key);
}

/**
 * Distributed Lock for ticket investigations to prevent race conditions or duplicate AI agent runs
 */
export async function acquireLock(lockKey: string, ttlSeconds: number = 30): Promise<boolean> {
  const fullKey = `lock:${lockKey}`;
  if (redisClient) {
    try {
      const acquired = await redisClient.set(fullKey, 'locked', { nx: true, ex: ttlSeconds });
      return !!acquired;
    } catch (err) {
      console.warn(`[Redis Lock Error] acquireLock(${fullKey}):`, err);
    }
  }

  // Fallback
  const existing = inMemoryCache.get(fullKey);
  if (existing && Date.now() <= existing.expiresAt) {
    return false;
  }
  inMemoryCache.set(fullKey, { value: 'locked', expiresAt: Date.now() + ttlSeconds * 1000 });
  return true;
}

export async function releaseLock(lockKey: string): Promise<void> {
  await delCache(`lock:${lockKey}`);
}

/**
 * Rate limiting helper for security and API protection
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 20,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}`;
  if (redisClient) {
    try {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, windowSeconds);
      }
      return {
        allowed: count <= maxRequests,
        remaining: Math.max(0, maxRequests - count),
      };
    } catch (err) {
      console.warn('[Redis RateLimit Error]:', err);
    }
  }

  // Fallback
  const cached = inMemoryCache.get(key);
  let count = (cached && Date.now() <= cached.expiresAt ? cached.value : 0) + 1;
  inMemoryCache.set(key, { value: count, expiresAt: Date.now() + windowSeconds * 1000 });

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
  };
}
