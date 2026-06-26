// src/modules/listing/listing.confirm.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

export function registerListingCallbacks(bot: Telegraf<BotContext>): void {
  bot.action(/^listing_confirm:(.+)$/, async (ctx) => {
    const listingId = ctx.match[1];
    const userId = String(ctx.from.id);

    try {
      const listing = await prisma.listing.findUnique({ where: { id: listingId } });
      if (!listing) { await ctx.answerCbQuery('Listing not found.'); return; }

      // Verify requester is admin of the group
      const member = await ctx.telegram.getChatMember(listing.chatId, parseInt(userId));
      if (!['creator', 'administrator'].includes(member.status)) {
        await ctx.answerCbQuery('❌ Only group admins can confirm listings.');
        return;
      }

      await prisma.listing.update({ where: { id: listingId }, data: { confirmed: true } });
      await ctx.answerCbQuery('✅ Listing confirmed!');
      await ctx.editMessageText('✅ Listing confirmed and queued for posting.');

      logger.info('[listing] Confirmed', { listingId, userId });
    } catch (err) {
      logger.error('[listing.confirm] callback failed', { listingId, err });
      await ctx.answerCbQuery('❌ Error confirming listing.');
    }
  });

  bot.action(/^listing_cancel:(.+)$/, async (ctx) => {
    const listingId = ctx.match[1];

    try {
      await prisma.listing.delete({ where: { id: listingId } });
      await ctx.answerCbQuery('Listing cancelled.');
      await ctx.editMessageText('❌ Listing cancelled.');
    } catch (err) {
      logger.error('[listing.confirm] cancel failed', { listingId, err });
      await ctx.answerCbQuery('Error cancelling listing.');
    }
  });
}
