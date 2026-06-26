// src/services/cache.service.ts
// Redis-backed cache with in-memory fallback.

import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ─── In-memory fallback ───────────────────────────────────────────────────────

interface MemEntry {
  value: string;
  expiresAt: number | null;
}

class MemoryCache {
  private store = new Map<string, MemEntry>();

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlSeconds?: number): void {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  ttl(key: string): number {
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt === null) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }
}

// ─── Cache Service ────────────────────────────────────────────────────────────

class CacheService {
  private redis: Redis | null = null;
  private memory = new MemoryCache();
  private useRedis = false;

  async connect(): Promise<void> {
    try {
      this.redis = new Redis(env.REDIS_URL, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });

      await this.redis.connect();
      this.useRedis = true;
      logger.info('[cache] Redis connected');
    } catch (err) {
      logger.warn('[cache] Redis unavailable — using in-memory cache', { err });
      this.redis = null;
      this.useRedis = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.useRedis && this.redis) {
      try {
        return await this.redis.get(key);
      } catch (err) {
        logger.warn('[cache] Redis GET failed, falling back', { key, err });
      }
    }
    return this.memory.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        if (ttlSeconds) {
          await this.redis.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch (err) {
        logger.warn('[cache] Redis SET failed, falling back', { key, err });
      }
    }
    this.memory.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (err) {
        logger.warn('[cache] Redis DEL failed, falling back', { key, err });
      }
    }
    this.memory.del(key);
  }

  async ttl(key: string): Promise<number> {
    if (this.useRedis && this.redis) {
      try {
        return await this.redis.ttl(key);
      } catch {
        // fall through
      }
    }
    return this.memory.ttl(key);
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      logger.info('[cache] Redis disconnected');
    }
  }
}

export const cache = new CacheService();
