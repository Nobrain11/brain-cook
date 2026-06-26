// src/modules/moderation/punish.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { LIMITS } from '../../config/limits';

export type PunishAction = 'mute' | 'ban' | 'warn' | 'delete';

export async function deleteMessage(
  bot: Telegraf<BotContext>,
  chatId: string,
  messageId: number,
): Promise<void> {
  await bot.telegram.deleteMessage(chatId, messageId).catch(() => null);
}

export async function muteUser(
  bot: Telegraf<BotContext>,
  chatId: string,
  userId: number,
  durationSeconds = LIMITS.moderation.muteDurationSeconds,
): Promise<boolean> {
  try {
    const until = Math.floor(Date.now() / 1000) + durationSeconds;
    await bot.telegram.restrictChatMember(chatId, userId, {
      permissions: { can_send_messages: false },
      until_date: until,
    });
    await logAction(chatId, String(userId), 'mute', `Muted for ${durationSeconds}s`, durationSeconds);
    return true;
  } catch (err) {
    logger.warn('[punish] muteUser failed', { chatId, userId, err });
    return false;
  }
}

export async function banUser(
  bot: Telegraf<BotContext>,
  chatId: string,
  userId: number,
  reason: string,
): Promise<boolean> {
  try {
    await bot.telegram.banChatMember(chatId, userId);
    await logAction(chatId, String(userId), 'ban', reason);
    return true;
  } catch (err) {
    logger.warn('[punish] banUser failed', { chatId, userId, err });
    return false;
  }
}

async function logAction(
  chatId: string,
  userId: string,
  action: string,
  reason: string,
  duration?: number,
): Promise<void> {
  try {
    await prisma.moderationAction.create({
      data: { chatId, userId, action, reason, duration },
    });
  } catch (err) {
    logger.warn('[punish] Failed to log moderation action', { chatId, userId, err });
  }
}
