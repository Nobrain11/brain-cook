// src/modules/moderation/spam.filter.ts

import { cache } from '../../services/cache.service';
import { logger } from '../../utils/logger';
import { LIMITS } from '../../config/limits';
import { REDIS_PREFIXES } from '../../utils/constants';

function spamKey(chatId: string, userId: string): string {
  return `${REDIS_PREFIXES.spamTrack}${chatId}:${userId}`;
}

/**
 * Returns true if the user has exceeded the spam message rate in this window.
 */
export async function isSpamming(chatId: string, userId: string): Promise<boolean> {
  const key = spamKey(chatId, userId);

  try {
    const raw = await cache.get(key);
    const count = raw ? parseInt(raw, 10) : 0;

    const next = count + 1;
    const windowSeconds = Math.ceil(LIMITS.moderation.spamWindowMs / 1000);
    await cache.set(key, String(next), next === 1 ? windowSeconds : undefined);

    return next > LIMITS.moderation.spamMaxMessages;
  } catch (err) {
    logger.warn('[spam.filter] Redis error', { chatId, userId, err });
    return false; // fail open
  }
}
