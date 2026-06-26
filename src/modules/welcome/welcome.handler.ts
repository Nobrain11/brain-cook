// src/modules/welcome/welcome.handler.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { formatWelcomeMessage, buildWelcomeButtons } from './welcome.format';
import { getWelcomeImagePath } from './welcome.image';
import { sendCaptcha } from '../moderation/captcha';

export function registerWelcomeHandler(bot: Telegraf<BotContext>): void {
  bot.on('new_chat_members', async (ctx) => {
    const chatId = String(ctx.chat.id);

    try {
      const [settings, modSettings, token] = await Promise.all([
        prisma.welcomeSettings.findUnique({ where: { chatId } }),
        prisma.moderationSettings.findUnique({ where: { chatId } }),
        prisma.token.findUnique({ where: { chatId } }),
      ]);

      for (const user of ctx.message.new_chat_members) {
        if (user.is_bot) continue;

        // Captcha gate takes priority
        if (modSettings?.captchaEnabled) {
          await sendCaptcha(bot, chatId, user.id, user.username);
          continue;
        }

        if (!settings?.enabled) continue;

        const text = formatWelcomeMessage(
          settings.message || '👋 Welcome to the group, {name}!',
          user,
        );

        const buttons = settings.showButtons ? buildWelcomeButtons(token) : undefined;
        const imagePath = await getWelcomeImagePath(chatId);

        if (imagePath) {
          await ctx.replyWithPhoto(
            { source: imagePath },
            { caption: text, parse_mode: 'Markdown', reply_markup: buttons },
          );
        } else {
          await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: buttons });
        }

        logger.info('[welcome] Welcomed user', { chatId, userId: user.id, username: user.username });
      }
    } catch (err) {
      logger.error('[welcome] Handler failed', { chatId, err });
    }
  });
}
