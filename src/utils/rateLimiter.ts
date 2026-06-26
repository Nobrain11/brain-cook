// src/utils/rateLimiter.ts
// Simple in-memory rate limiter with Redis fallback hook.

import { cache } from '../services/cache.service';
import { logger } from './logger';

interface RateLimitOptions {
  key: string;
  windowMs: number;
  max: number;
}

/**
 * Returns true if the action is allowed, false if rate-limited.
 * Increments the counter on each allowed call.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<boolean> {
  const { key, windowMs, max } = opts;
  const windowSeconds = Math.ceil(windowMs / 1000);

  try {
    const raw = await cache.get(key);
    const current = raw ? parseInt(raw, 10) : 0;

    if (current >= max) return false;

    const next = current + 1;
    await cache.set(key, String(next), next === 1 ? windowSeconds : undefined);
    return true;
  } catch (err) {
    logger.warn('[rateLimiter] Redis error — allowing request', { key, err });
    return true; // fail open
  }
}

/**
 * Returns the remaining TTL in ms for a key, or 0 if not found.
 */
export async function getRemainingCooldown(key: string): Promise<number> {
  try {
    const ttl = await cache.ttl(key);
    return ttl > 0 ? ttl * 1000 : 0;
  } catch {
    return 0;
  }
}

/**
 * Sets a cooldown key with a given TTL (no counter, just presence).
 */
export async function setCooldown(key: string, ttlMs: number): Promise<void> {
  try {
    await cache.set(key, '1', Math.ceil(ttlMs / 1000));
  } catch (err) {
    logger.warn('[rateLimiter] Failed to set cooldown', { key, err });
  }
}

/**
 * Returns true if a cooldown key is still active.
 */
export async function isOnCooldown(key: string): Promise<boolean> {
  try {
    const val = await cache.get(key);
    return val !== null;
  } catch {
    return false;
  }
}
