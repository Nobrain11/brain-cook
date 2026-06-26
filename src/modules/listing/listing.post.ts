// src/modules/listing/listing.post.ts
// Posts confirmed listings to a global announcement channel.

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { formatListingAnnouncement } from './listing.format';
import { scheduler } from '../../services/scheduler';

// Set your global listings channel ID here (or make it configurable per env)
const GLOBAL_LISTINGS_CHANNEL = process.env.LISTINGS_CHANNEL_ID ?? '';

export function registerListingPoster(bot: Telegraf<BotContext>): void {
  // Run every 10 minutes to post confirmed, unposted listings
  scheduler.register('listing-poster', '*/10 * * * *', () => runListingPoster(bot));
  logger.info('[listing.post] Poster registered');
}

async function runListingPoster(bot: Telegraf<BotContext>): Promise<void> {
  if (!GLOBAL_LISTINGS_CHANNEL) return;

  let pending: Array<{ id: string; chatId: string; message: string }>;

  try {
    pending = await prisma.listing.findMany({
      where: { confirmed: true, postedAt: null },
    });
  } catch (err) {
    logger.error('[listing.post] Failed to query listings', { err });
    return;
  }

  for (const listing of pending) {
    try {
      const token = await prisma.token.findUnique({ where: { chatId: listing.chatId } });
      if (!token) continue;

      const text = formatListingAnnouncement(token, listing.message);

      await bot.telegram.sendMessage(GLOBAL_LISTINGS_CHANNEL, text, { parse_mode: 'Markdown' });
      await prisma.listing.update({ where: { id: listing.id }, data: { postedAt: new Date() } });

      logger.info('[listing.post] Posted listing', { listingId: listing.id });
    } catch (err) {
      logger.error('[listing.post] Failed to post listing', { listingId: listing.id, err });
    }
  }
}
