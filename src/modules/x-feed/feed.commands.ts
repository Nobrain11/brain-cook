// src/modules/x-feed/feed.commands.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { requireAdmin } from '../../config/permissions';
import { addFeed, removeFeed, listFeeds, toggleFeed } from './feed.settings';
import { logger } from '../../utils/logger';

export function registerFeedCommands(bot: Telegraf<BotContext>): void {

  bot.command('addfeed', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const username = ctx.message.text.split(' ')[1]?.replace('@', '');
    if (!username) { await ctx.reply('Usage: /addfeed <@username>'); return; }

    const chatId = String(ctx.chat.id);
    const ok = await addFeed(chatId, username);
    await ctx.reply(ok ? `✅ @${username} added to feed list.` : `❌ Could not add feed. Max limit reached or already exists.`);
  });

  bot.command('removefeed', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const username = ctx.message.text.split(' ')[1]?.replace('@', '');
    if (!username) { await ctx.reply('Usage: /removefeed <@username>'); return; }

    const chatId = String(ctx.chat.id);
    const ok = await removeFeed(chatId, username);
    await ctx.reply(ok ? `✅ @${username} removed.` : `❌ Remove failed.`);
  });

  bot.command('listfeeds', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const chatId = String(ctx.chat.id);
    const feeds = await listFeeds(chatId);

    if (feeds.length === 0) { await ctx.reply('No feeds configured.'); return; }

    const lines = feeds.map((f) => `${f.enabled ? '🟢' : '🔴'} @${f.xUsername}`).join('\n');
    await ctx.reply(`*X Feeds:*\n${lines}`, { parse_mode: 'Markdown' });
  });

  bot.command('togglefeed', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const parts = ctx.message.text.split(' ');
    const username = parts[1]?.replace('@', '');
    const state = parts[2];

    if (!username || !['on', 'off'].includes(state)) {
      await ctx.reply('Usage: /togglefeed <@username> <on|off>');
      return;
    }

    const chatId = String(ctx.chat.id);
    const ok = await toggleFeed(chatId, username, state === 'on');
    await ctx.reply(ok ? `✅ Feed @${username} turned ${state}.` : `❌ Toggle failed.`);
  });
}
