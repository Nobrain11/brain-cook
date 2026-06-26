// src/modules/volume/volume.cron.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { scheduler } from '../../services/scheduler';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { getVolumeSettings } from './volume.settings';
import { getCachedSnapshot, setCachedSnapshot } from './volume.cache';
import { calcVolume, formatVolume } from './volume.calc';
import { LIMITS } from '../../config/limits';

export function registerVolumeCron(bot: Telegraf<BotContext>): void {
  scheduler.register('volume-tracker', LIMITS.volume.cronInterval, () => runVolumeJob(bot));
  logger.info('[volume.cron] Registered');
}

async function runVolumeJob(bot: Telegraf<BotContext>): Promise<void> {
  let rows: Array<{ chatId: string }>;

  try {
    rows = await prisma.volumeSettings.findMany({
      where: { enabled: true },
      select: { chatId: true },
    });
  } catch (err) {
    logger.error('[volume.cron] Failed to load chats', { err });
    return;
  }

  await Promise.allSettled(rows.map(({ chatId }) => processChatVolume(bot, chatId)));
}

async function processChatVolume(bot: Telegraf<BotContext>, chatId: string): Promise<void> {
  const settings = await getVolumeSettings(chatId);
  if (!settings || !settings.enabled) return;

  const token = await prisma.token.findUnique({ where: { chatId } });
  if (!token) return;

  const previous = await getCachedSnapshot(chatId);
  const result = await calcVolume(settings, previous, token.address, token.chain as 'solana' | 'eth' | 'bsc' | 'base');
  if (!result) return;

  await setCachedSnapshot(chatId, result.snapshot);

  for (const milestone of result.crossedMilestones) {
    await announceMilestone(bot, settings, milestone, result.snapshot).catch(() => null);
  }
}

async function announceMilestone(
  bot: Telegraf<BotContext>,
  settings: NonNullable<Awaited<ReturnType<typeof getVolumeSettings>>>,
  milestone: number,
  snapshot: { volume24h: number; volume1h: number; volume5m: number },
): Promise<void> {
  const targetId = settings.announcementChannelId ?? settings.chatId;

  const text = [
    `🚀 *Volume Milestone!*`,
    ``,
    `📊 24h Volume crossed *${formatVolume(milestone)}*`,
    ``,
    `5m: ${formatVolume(snapshot.volume5m)}`,
    `1h: ${formatVolume(snapshot.volume1h)}`,
    `24h: *${formatVolume(snapshot.volume24h)}*`,
  ].join('\n');

  await bot.telegram.sendMessage(targetId, text, { parse_mode: 'Markdown' });
  logger.info('[volume.cron] Milestone announced', { chatId: settings.chatId, milestone });
}
