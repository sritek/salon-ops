/**
 * Redis Client (Conditional)
 * Based on: .cursor/rules/13-backend-implementation.mdc lines 666-686
 *
 * Redis is optional for pilot deployment. When ENABLE_REDIS is false,
 * all Redis operations become no-ops that return safe defaults.
 */

import Redis from 'ioredis';

import { env } from '../config/env';
import { logger } from './logger';

// Export flag for other modules to check
export const isRedisEnabled = env.ENABLE_REDIS;

// Create Redis client only if enabled
let redisClient: Redis | null = null;

if (isRedisEnabled && env.REDIS_URL) {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });
} else {
  logger.info('Redis disabled - running without Redis');
}

/**
 * Redis wrapper that provides no-op behavior when Redis is disabled.
 * This allows code to call Redis methods without checking the flag everywhere.
 */
const redis = {
  /**
   * Get the underlying Redis client (null if disabled)
   */
  get client(): Redis | null {
    return redisClient;
  },

  /**
   * Check if Redis is enabled
   */
  get isEnabled(): boolean {
    return isRedisEnabled;
  },

  /**
   * Get a value from Redis
   */
  async get(key: string): Promise<string | null> {
    if (!redisClient) return null;
    return redisClient.get(key);
  },

  /**
   * Set a value with TTL
   */
  async setex(key: string, ttl: number, value: string): Promise<void> {
    if (!redisClient) return;
    await redisClient.setex(key, ttl, value);
  },

  /**
   * Set a value without TTL
   */
  async set(key: string, value: string): Promise<void> {
    if (!redisClient) return;
    await redisClient.set(key, value);
  },

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    if (!redisClient) return;
    await redisClient.del(key);
  },

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    if (!redisClient) return [];
    return redisClient.keys(pattern);
  },

  /**
   * Get list range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!redisClient) return [];
    return redisClient.lrange(key, start, stop);
  },

  /**
   * Push to list
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!redisClient) return 0;
    return redisClient.lpush(key, ...values);
  },

  /**
   * Trim list
   */
  async ltrim(key: string, start: number, stop: number): Promise<void> {
    if (!redisClient) return;
    await redisClient.ltrim(key, start, stop);
  },

  /**
   * Publish to channel
   */
  async publish(channel: string, message: string): Promise<number> {
    if (!redisClient) return 0;
    return redisClient.publish(channel, message);
  },

  /**
   * Duplicate connection (for pub/sub)
   */
  duplicate(): Redis | null {
    if (!redisClient) return null;
    return redisClient.duplicate();
  },

  /**
   * Quit connection
   */
  async quit(): Promise<void> {
    if (!redisClient) return;
    await redisClient.quit();
  },
};

export default redis;

/**
 * Cache utility functions
 * Based on: .cursor/rules/13-backend-implementation.mdc lines 689-753
 */
export const cache = {
  /**
   * Get cached value or fetch from source
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 300): Promise<T> {
    if (!isRedisEnabled) {
      // When Redis is disabled, always fetch fresh data
      return fetcher();
    }

    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    const value = await fetcher();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return value;
  },

  /**
   * Set cache with TTL
   */
  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    if (!isRedisEnabled) return;
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisEnabled) return null;
    const cached = await redis.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  },

  /**
   * Delete cache key
   */
  async del(key: string): Promise<void> {
    if (!isRedisEnabled) return;
    await redis.del(key);
  },

  /**
   * Delete cache keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    if (!isRedisEnabled) return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      for (const key of keys) {
        await redis.del(key);
      }
    }
  },

  /**
   * Invalidate all cache for a tenant
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    await this.delByPattern(`tenant:${tenantId}:*`);
  },
};
