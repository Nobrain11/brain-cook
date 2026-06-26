// src/modules/x-feed/feed.settings.ts

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { LIMITS } from '../../config/limits';

export async function addFeed(chatId: string, xUsername: string): Promise<boolean> {
  try {
    const count = await prisma.xFeed.count({ where: { chatId, enabled: true } });
    if (count >= LIMITS.xfeed.maxFeedsPerGroup) return false;

    await prisma.xFeed.upsert({
      where: { chatId_xUsername: { chatId, xUsername } },
      create: { chatId, xUsername, enabled: true },
      update: { enabled: true },
    });
    return true;
  } catch (err) {
    logger.error('[feed.settings] addFeed failed', { chatId, xUsername, err });
    return false;
  }
}

export async function removeFeed(chatId: string, xUsername: string): Promise<boolean> {
  try {
    await prisma.xFeed.deleteMany({ where: { chatId, xUsername } });
    return true;
  } catch (err) {
    logger.error('[feed.settings] removeFeed failed', { chatId, xUsername, err });
    return false;
  }
}

export async function listFeeds(chatId: string) {
  return prisma.xFeed.findMany({ where: { chatId } });
}

export async function toggleFeed(chatId: string, xUsername: string, enabled: boolean): Promise<boolean> {
  try {
    await prisma.xFeed.updateMany({ where: { chatId, xUsername }, data: { enabled } });
    return true;
  } catch (err) {
    logger.error('[feed.settings] toggleFeed failed', { chatId, xUsername, err });
    return false;
  }
}

export async function updateLastTweetId(feedId: string, lastTweetId: string): Promise<void> {
  try {
    await prisma.xFeed.update({ where: { id: feedId }, data: { lastTweetId } });
  } catch (err) {
    logger.error('[feed.settings] updateLastTweetId failed', { feedId, err });
  }
}
