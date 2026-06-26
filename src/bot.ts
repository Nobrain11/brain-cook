// src/bot.ts

import { Telegraf, session } from 'telegraf';
import type { BotContext } from './types/global';
import { env } from './config/env';
import { logger } from './utils/logger';

// Modules
import { registerRaidCommands } from './modules/raid/raid.commands';
import { registerFeedWatcher } from './modules/x-feed/feed.watcher';
import { registerFeedCommands } from './modules/x-feed/feed.commands';
import { registerBuyListener } from './modules/buy-alert/buy.listener';
import { registerVolumeCron } from './modules/volume/volume.cron';
import { registerMentionCommands } from './modules/mention/mention.command';
import { registerModCommands } from './modules/moderation/mod.commands';
import { registerRankCommands } from './modules/rank/rank.command';
import { registerTokenCommands } from './modules/token/token.register';
import { registerWelcomeHandler } from './modules/welcome/welcome.handler';
import { registerWelcomeCommands } from './modules/welcome/welcome.commands';
import { registerFilterMiddleware } from './modules/filters/filter.middleware';
import { registerFilterCommands } from './modules/filters/filter.commands';
import { registerListingCommands } from './modules/listing/listing.register';
import { registerListingCallbacks } from './modules/listing/listing.confirm';
import { registerListingPoster } from './modules/listing/listing.post';
import { registerAdminCommands } from './modules/admin/admin.commands';
import { awardMessageXp } from './modules/rank/xp.service';
import { verifyCaptcha, hasPendingCaptcha } from './modules/moderation/captcha';

export function createBot(): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(env.BOT_TOKEN);

  // Session
  bot.use(session());

  // Global error handler
  bot.catch((err, ctx) => {
    logger.error('[bot] Unhandled error', {
      err,
      updateType: ctx.updateType,
      chatId: ctx.chat?.id,
      userId: ctx.from?.id,
    });
  });

  // Dev request logger
  if (env.NODE_ENV === 'development') {
    bot.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      logger.debug('[bot] Update processed', {
        type: ctx.updateType,
        ms: Date.now() - start,
      });
    });
  }

  // Filter middleware (runs before commands)
  registerFilterMiddleware(bot);

  // Captcha intercept
  bot.on('text', async (ctx, next) => {
    const chatId = String(ctx.chat?.id);
    const userId = String(ctx.from?.id);

    if (await hasPendingCaptcha(chatId, userId)) {
      const solved = await verifyCaptcha(bot, chatId, ctx.from.id, ctx.message.text);
      if (solved) {
        await ctx.reply(`✅ Welcome! You're verified.`);
      }
      return;
    }

    return next();
  });

  // XP on every message
  bot.on('text', async (ctx, next) => {
    const chatId = String(ctx.chat?.id);
    const userId = String(ctx.from?.id);
    const username = ctx.from?.username;

    if (ctx.chat?.type !== 'private') {
      const { leveledUp, newLevel } = await awardMessageXp(chatId, userId, username);
      if (leveledUp) {
        await ctx.reply(
          `🎉 *${ctx.from?.first_name ?? 'User'}* levelled up to *Level ${newLevel}*! 🚀`,
          { parse_mode: 'Markdown' },
        ).catch(() => null);
      }
    }

    return next();
  });

  // Welcome
  registerWelcomeHandler(bot);

  // Commands
  registerRaidCommands(bot);
  registerFeedCommands(bot);
  registerMentionCommands(bot);
  registerModCommands(bot);
  registerRankCommands(bot);
  registerTokenCommands(bot);
  registerWelcomeCommands(bot);
  registerFilterCommands(bot);
  registerListingCommands(bot);
  registerListingCallbacks(bot);
  registerAdminCommands(bot);

  // Background services
  registerFeedWatcher(bot);
  registerBuyListener(bot);
  registerVolumeCron(bot);
  registerListingPoster(bot);

  // /start & /help
  bot.start(async (ctx) => {
    await ctx.reply(
      `🔰 *SuperBot*\n\n` +
      `The ultimate bot for crypto communities! The best protection & token buy tracker on Telegram.\n\n` +
      `/setup — Create a portal\n` +
      `/config — Enter group config\n` +
      `/settoken — Add your Solana token\n` +
      `/help — All commands\n\n` +
      `📖 [Documentation](https://t.me/superbotdocs)\n` +
      `🐦 [Twitter](https://twitter.com/superbot)\n` +
      `🔒 Privacy Statements`,
      { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } },
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      `🔰 *SuperBot Commands*\n\n` +
      `*🪙 Token*\n` +
      `/settoken <address> <symbol> <name>\n` +
      `/token — View registered token\n` +
      `/removetoken — Remove token\n\n` +
      `*🐦 Raids*\n` +
      `/raid <tweet_url> — Start a raid\n` +
      `/verify — Claim your raid XP\n` +
      `/endraid — Close active raid\n` +
      `/raidstats — Raid statistics\n\n` +
      `*🏆 Rank*\n` +
      `/rank — Your XP & level\n` +
      `/leaderboard — Top members\n\n` +
      `*📣 Mentions*\n` +
      `/mention — Tag opted-in members\n` +
      `/optin — Join mention pool\n` +
      `/optout — Leave mention pool\n\n` +
      `*🧵 X Feed*\n` +
      `/addfeed /removefeed /listfeeds /togglefeed\n\n` +
      `*🛡 Moderation*\n` +
      `/mute /ban /warn /unban\n\n` +
      `*🚫 Filters*\n` +
      `/addfilter /removefilter /listfilters\n\n` +
      `*👋 Welcome*\n` +
      `/setwelcome /togglewelcome\n\n` +
      `*⚙️ Admin*\n` +
      `/enable /disable /features\n` +
      `/list — Global listing\n` +
      `/setpro — Activate PRO\n` +
      `/botstatus /auditlog`,
      { parse_mode: 'Markdown' },
    );
  });

  return bot;
}
