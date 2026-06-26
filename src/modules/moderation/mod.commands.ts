// src/modules/moderation/mod.commands.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { requireAdmin } from '../../config/permissions';
import { prisma } from '../../db/client';
import { muteUser, banUser } from './punish';
import { logger } from '../../utils/logger';

export function registerModCommands(bot: Telegraf<BotContext>): void {

  bot.command('mute', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const reply = ctx.message.reply_to_message;
    if (!reply) { await ctx.reply('Reply to a message to mute the user.'); return; }

    const chatId = String(ctx.chat.id);
    const ok = await muteUser(bot, chatId, reply.from!.id);
    await ctx.reply(ok ? `🔇 @${reply.from!.username ?? reply.from!.first_name} muted for 10 minutes.` : '❌ Failed to mute.');
  });

  bot.command('ban', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const reply = ctx.message.reply_to_message;
    if (!reply) { await ctx.reply('Reply to a message to ban the user.'); return; }

    const chatId = String(ctx.chat.id);
    const reason = ctx.message.text.split(' ').slice(1).join(' ') || 'No reason given';
    const ok = await banUser(bot, chatId, reply.from!.id, reason);
    await ctx.reply(ok ? `🔨 @${reply.from!.username ?? reply.from!.first_name} banned.` : '❌ Failed to ban.');
  });

  bot.command('unban', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const parts = ctx.message.text.split(' ');
    const userIdStr = parts[1];
    if (!userIdStr) { await ctx.reply('Usage: /unban <user_id>'); return; }

    const chatId = String(ctx.chat.id);
    try {
      await bot.telegram.unbanChatMember(chatId, parseInt(userIdStr));
      await ctx.reply(`✅ User ${userIdStr} unbanned.`);
    } catch (err) {
      logger.warn('[mod] unban failed', { chatId, userIdStr, err });
      await ctx.reply('❌ Unban failed.');
    }
  });

  bot.command('warn', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const reply = ctx.message.reply_to_message;
    if (!reply) { await ctx.reply('Reply to a message to warn the user.'); return; }

    const chatId = String(ctx.chat.id);
    const reason = ctx.message.text.split(' ').slice(1).join(' ') || 'No reason given';

    try {
      await prisma.moderationAction.create({
        data: {
          chatId,
          userId: String(reply.from!.id),
          username: reply.from!.username,
          action: 'warn',
          reason,
        },
      });

      const count = await prisma.moderationAction.count({
        where: { chatId, userId: String(reply.from!.id), action: 'warn' },
      });

      await ctx.reply(
        `⚠️ @${reply.from!.username ?? reply.from!.first_name} warned. (${count} total)\nReason: ${reason}`,
      );
    } catch (err) {
      logger.error('[mod] warn failed', { chatId, err });
      await ctx.reply('❌ Failed to issue warning.');
    }
  });

  bot.command('modsettings', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const chatId = String(ctx.chat.id);

    const settings = await prisma.moderationSettings.findUnique({ where: { chatId } });
    if (!settings) { await ctx.reply('No moderation settings found.'); return; }

    await ctx.reply(
      `🛡 *Moderation Settings*\n\n` +
      `Spam filter: ${settings.spamEnabled ? '✅' : '❌'}\n` +
      `Link guard: ${settings.linkGuardEnabled ? '✅' : '❌'}\n` +
      `Captcha: ${settings.captchaEnabled ? '✅' : '❌'}\n` +
      `Auto mute: ${settings.autoMuteEnabled ? '✅' : '❌'}\n` +
      `Auto ban: ${settings.autoBanEnabled ? '✅' : '❌'}`,
      { parse_mode: 'Markdown' },
    );
  });
}
