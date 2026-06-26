// src/modules/mention/mention.limits.ts

import { isOnCooldown, setCooldown, checkRateLimit } from '../../utils/rateLimiter';
import { LIMITS } from '../../config/limits';
import { REDIS_PREFIXES } from '../../utils/constants';

function cooldownKey(chatId: string, userId: string): string {
  return `${REDIS_PREFIXES.mentionCooldown}${chatId}:${userId}`;
}

function dailyKey(chatId: string, userId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${REDIS_PREFIXES.mentionDaily}${chatId}:${userId}:${today}`;
}

export async function checkMentionAllowed(chatId: string, userId: string): Promise<{ allowed: boolean; reason?: string }> {
  if (await isOnCooldown(cooldownKey(chatId, userId))) {
    return { allowed: false, reason: `⏳ Mention cooldown active. Try again in a few minutes.` };
  }

  const dailyOk = await checkRateLimit({
    key: dailyKey(chatId, userId),
    windowMs: 24 * 60 * 60 * 1000,
    max: LIMITS.mention.dailyCapPerUser,
  });

  if (!dailyOk) {
    return { allowed: false, reason: `🚫 Daily mention limit reached (${LIMITS.mention.dailyCapPerUser}/day).` };
  }

  return { allowed: true };
}

export async function applyMentionCooldown(chatId: string, userId: string): Promise<void> {
  await setCooldown(cooldownKey(chatId, userId), LIMITS.mention.cooldownMs);
}
