// src/modules/welcome/welcome.commands.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { requireAdmin } from '../../config/permissions';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

export function registerWelcomeCommands(bot: Telegraf<BotContext>): void {

  /**
   * /setwelcome <message>
   * Supports placeholders: {name}, {username}, {first}, {id}
   */
  bot.command('setwelcome', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const text = ctx.message.text.split(' ').slice(1).join(' ');
    if (!text) {
      await ctx.reply('Usage: /setwelcome <message>\nPlaceholders: {name}, {username}, {first}, {id}');
      return;
    }

    const chatId = String(ctx.chat.id);

    try {
      await prisma.welcomeSettings.upsert({
        where: { chatId },
        create: { chatId, message: text },
        update: { message: text },
      });
      await ctx.reply(`✅ Welcome message updated!\n\nPreview:\n${text}`);
    } catch (err) {
      logger.error('[welcome.commands] setwelcome failed', { chatId, err });
      await ctx.reply('❌ Failed to update welcome message.');
    }
  });

  bot.command('togglewelcome', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const chatId = String(ctx.chat.id);

    try {
      const current = await prisma.welcomeSettings.findUnique({ where: { chatId } });
      const newState = !(current?.enabled ?? true);

      await prisma.welcomeSettings.upsert({
        where: { chatId },
        create: { chatId, enabled: newState },
        update: { enabled: newState },
      });

      await ctx.reply(`✅ Welcome messages ${newState ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      logger.error('[welcome.commands] togglewelcome failed', { chatId: String(ctx.chat.id), err });
      await ctx.reply('❌ Failed to toggle welcome.');
    }
  });

  bot.command('welcomeinfo', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const chatId = String(ctx.chat.id);
    const settings = await prisma.welcomeSettings.findUnique({ where: { chatId } });

    if (!settings) {
      await ctx.reply('No welcome settings configured. Use /setwelcome to set one.');
      return;
    }

    await ctx.reply(
      `👋 *Welcome Settings*\n\n` +
      `Enabled: ${settings.enabled ? '✅' : '❌'}\n` +
      `Message:\n${settings.message}`,
      { parse_mode: 'Markdown' },
    );
  });
}
