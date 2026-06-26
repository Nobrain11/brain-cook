// src/modules/mention/mention.command.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { logger } from '../../utils/logger';
import { getRandomMentionTargets } from './mention.rotate';
import { checkMentionAllowed, applyMentionCooldown } from './mention.limits';
import { registerMentionOptCommands } from './mention.opt';

export function registerMentionCommands(bot: Telegraf<BotContext>): void {
  registerMentionOptCommands(bot);

  bot.command('mention', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const userId = String(ctx.from.id);

    try {
      const { allowed, reason } = await checkMentionAllowed(chatId, userId);
      if (!allowed) {
        await ctx.reply(reason ?? '❌ Not allowed right now.');
        return;
      }

      const targets = await getRandomMentionTargets(chatId, userId);
      if (targets.length === 0) {
        await ctx.reply('😕 No opted-in users to mention yet. Ask members to use /optin!');
        return;
      }

      const mentions = targets
        .map((t) => t.username ? `@${t.username}` : `[user](tg://user?id=${t.userId})`)
        .join(' ');

      await applyMentionCooldown(chatId, userId);
      await ctx.reply(`👋 Hey ${mentions} — what do you think? 💬`, { parse_mode: 'Markdown' });

      logger.info('[mention] Mentioned users', { chatId, userId, count: targets.length });
    } catch (err) {
      logger.error('[mention] /mention command failed', { chatId, userId, err });
      await ctx.reply('❌ Mention failed. Try again.');
    }
  });
}
