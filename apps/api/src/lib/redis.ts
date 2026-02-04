/**
 * Redis Client
 * Based on: .cursor/rules/13-backend-implementation.mdc lines 666-686
 */

import Redis from 'ioredis';

import { env } from '../config/env';
import { logger } from './logger';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

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
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  },

  /**
   * Delete cache key
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Delete cache keys by pattern
   */
  async delByPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },

  /**
   * Invalidate all cache for a tenant
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    await this.delByPattern(`tenant:${tenantId}:*`);
  },
};
