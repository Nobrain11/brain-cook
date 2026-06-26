// src/modules/filters/filter.middleware.ts
// Core filter middleware — plugged into bot.on('message') in bot.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { getFilterRules, matchesFilterRule } from './filter.rules';
import { isExemptFromFilters } from './filter.exempt';
import { logFilterHit } from './filter.log';
import { deleteMessage, muteUser, banUser } from '../moderation/punish';
import { shouldBlockForLinks } from '../moderation/link.guard';
import { isSpamming } from '../moderation/spam.filter';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';

export function registerFilterMiddleware(bot: Telegraf<BotContext>): void {
  bot.on('message', async (ctx, next) => {
    const chatId = String(ctx.chat?.id);
    const userId = String(ctx.from?.id);
    const messageId = ctx.message?.message_id;

    // Only filter group chats
    if (ctx.chat?.type === 'private') return next();

    const text = 'text' in ctx.message ? ctx.message.text : '';
    if (!text) return next();

    try {
      // Skip exempt users (admins, trusted)
      if (await isExemptFromFilters(ctx, userId)) return next();

      const modSettings = await prisma.moderationSettings.findUnique({ where: { chatId } });

      // ── Spam detection ────────────────────────────────────────────
      if (modSettings?.spamEnabled) {
        const spamming = await isSpamming(chatId, userId);
        if (spamming) {
          if (messageId) await deleteMessage(bot, chatId, messageId);
          if (modSettings.autoMuteEnabled) await muteUser(bot, chatId, parseInt(userId));
          logger.info('[filter] Spam blocked', { chatId, userId });
          return; // Don't call next
        }
      }

      // ── Link guard ────────────────────────────────────────────────
      if (modSettings?.linkGuardEnabled) {
        if (shouldBlockForLinks(text, env.BOT_USERNAME)) {
          if (messageId) await deleteMessage(bot, chatId, messageId);
          await ctx.reply(`🚫 External links are not allowed here.`).catch(() => null);
          logger.info('[filter] Link blocked', { chatId, userId });
          return;
        }
      }

      // ── Custom filter rules ───────────────────────────────────────
      const rules = await getFilterRules(chatId);
      const hit = matchesFilterRule(text, rules);

      if (hit) {
        if (messageId) await deleteMessage(bot, chatId, messageId);

        logFilterHit({
          chatId,
          userId,
          username: ctx.from?.username,
          messageText: text,
          rule: hit,
          actionTaken: hit.action,
          timestamp: Date.now(),
        });

        if (hit.action === 'mute') await muteUser(bot, chatId, parseInt(userId));
        if (hit.action === 'ban') await banUser(bot, chatId, parseInt(userId), `Filter rule: ${hit.value}`);

        return;
      }

      return next();
    } catch (err) {
      logger.error('[filter.middleware] Unhandled error', { chatId, userId, err });
      return next(); // Fail open — never break chat
    }
  });
}
