// src/modules/raid/raid.cooldown.ts

import { isOnCooldown, setCooldown, getRemainingCooldown } from '../../utils/rateLimiter';
import { LIMITS } from '../../config/limits';
import { REDIS_PREFIXES } from '../../utils/constants';

function cooldownKey(chatId: string, userId: string): string {
  return `${REDIS_PREFIXES.raidCooldown}${chatId}:${userId}`;
}

export async function isRaidOnCooldown(chatId: string, userId: string): Promise<boolean> {
  return isOnCooldown(cooldownKey(chatId, userId));
}

export async function setRaidCooldown(chatId: string, userId: string): Promise<void> {
  await setCooldown(cooldownKey(chatId, userId), LIMITS.raid.cooldownMs);
}

export async function getRaidCooldownRemaining(chatId: string, userId: string): Promise<number> {
  return getRemainingCooldown(cooldownKey(chatId, userId));
}
