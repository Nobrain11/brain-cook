// src/modules/volume/volume.cache.ts

import { cache } from '../../services/cache.service';
import { logger } from '../../utils/logger';
import { REDIS_PREFIXES } from '../../utils/constants';
import { LIMITS } from '../../config/limits';

export interface VolumeSnapshot {
  volume5m: number;
  volume1h: number;
  volume24h: number;
  fetchedAt: number;
}

function key(chatId: string): string {
  return `${REDIS_PREFIXES.volSnapshot}${chatId}`;
}

export async function getCachedSnapshot(chatId: string): Promise<VolumeSnapshot | null> {
  try {
    const raw = await cache.get(key(chatId));
    return raw ? (JSON.parse(raw) as VolumeSnapshot) : null;
  } catch (err) {
    logger.warn('[volume.cache] getCachedSnapshot error', { chatId, err });
    return null;
  }
}

export async function setCachedSnapshot(chatId: string, snapshot: VolumeSnapshot): Promise<void> {
  try {
    await cache.set(key(chatId), JSON.stringify(snapshot), LIMITS.volume.cacheTtlSeconds);
  } catch (err) {
    logger.warn('[volume.cache] setCachedSnapshot error', { chatId, err });
  }
}

export async function invalidateSnapshot(chatId: string): Promise<void> {
  try {
    await cache.del(key(chatId));
  } catch (err) {
    logger.warn('[volume.cache] invalidateSnapshot error', { chatId, err });
  }
}
