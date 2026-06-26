// src/modules/mention/mention.opt.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

async function ensureMentionSettings(chatId: string): Promise<void> {
  await prisma.mentionSettings.upsert({
    where: { chatId },
    create: { chatId, enabled: true, maxPerCall: 5 },
    update: {},
  });
}

export function registerMentionOptCommands(bot: Telegraf<BotContext>): void {

  bot.command('optin', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const userId = String(ctx.from.id);
    const username = ctx.from.username;

    try {
      // Make sure MentionSettings row exists before inserting MentionOptIn
      await ensureMentionSettings(chatId);

      await prisma.mentionOptIn.upsert({
        where: { chatId_userId: { chatId, userId } },
        create: { chatId, userId, username },
        update: { username },
      });

      await ctx.reply(`✅ You're now opted in to mentions, ${username ? '@' + username : ctx.from.first_name}!`);
    } catch (err) {
      logger.error('[mention.opt] optin failed', { chatId, userId, err });
      await ctx.reply('❌ Failed to opt in. Try again.');
    }
  });

  bot.command('optout', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const userId = String(ctx.from.id);

    try {
      await prisma.mentionOptIn.deleteMany({ where: { chatId, userId } });
      await ctx.reply('✅ You have opted out of mentions.');
    } catch (err) {
      logger.error('[mention.opt] optout failed', { chatId, userId, err });
      await ctx.reply('❌ Failed to opt out. Try again.');
    }
  });
}
