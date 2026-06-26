// src/modules/listing/listing.register.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { requireAdmin } from '../../config/permissions';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { formatListingAnnouncement } from './listing.format';

export function registerListingCommands(bot: Telegraf<BotContext>): void {

  /**
   * /list <message>
   * Submits this group's token to the global listing channel.
   */
  bot.command('list', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const message = ctx.message.text.split(' ').slice(1).join(' ');
    if (!message) {
      await ctx.reply('Usage: /list <announcement message>');
      return;
    }

    const chatId = String(ctx.chat.id);

    try {
      const token = await prisma.token.findUnique({ where: { chatId } });
      if (!token) {
        await ctx.reply('❌ No token registered. Use /settoken first.');
        return;
      }

      const listing = await prisma.listing.create({
        data: { chatId, tokenSymbol: token.symbol, message, confirmed: false },
      });

      const preview = formatListingAnnouncement(token, message);

      await ctx.reply(
        `📋 *Listing Preview*\n\n${preview}\n\n_Confirm to submit to the global channel._`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Confirm', callback_data: `listing_confirm:${listing.id}` },
              { text: '❌ Cancel', callback_data: `listing_cancel:${listing.id}` },
            ]],
          },
        },
      );

      logger.info('[listing] Listing draft created', { chatId, listingId: listing.id });
    } catch (err) {
      logger.error('[listing] /list command failed', { chatId, err });
      await ctx.reply('❌ Failed to create listing.');
    }
  });

  bot.command('mylistings', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const chatId = String(ctx.chat.id);

    const listings = await prisma.listing.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (listings.length === 0) { await ctx.reply('No listings found.'); return; }

    const lines = listings.map((l) =>
      `• ${l.confirmed ? '✅' : '⏳'} ${l.tokenSymbol} — ${l.postedAt ? 'Posted' : 'Pending'} (${l.createdAt.toDateString()})`,
    ).join('\n');

    await ctx.reply(`📋 *Your Listings:*\n\n${lines}`, { parse_mode: 'Markdown' });
  });
}
