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
      `👋 *Telegram SuperBot*\n\nA full-featured crypto community bot.\n\nUse /help to see all commands.`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      `📖 *Available Commands*\n\n` +
      `*Token*\n/settoken — Register your token\n/token — View token info\n\n` +
      `*Raids*\n/raid <url> — Start a tweet raid\n/verify — Claim raid XP\n/endraid — End active raid\n/raidstats — Statistics\n\n` +
      `*Rank*\n/rank — Your XP & level\n/leaderboard — Top members\n\n` +
      `*Mentions*\n/mention — Tag random opted-in users\n/optin — Opt in\n/optout — Opt out\n\n` +
      `*X Feed*\n/addfeed /removefeed /listfeeds /togglefeed\n\n` +
      `*Moderation*\n/mute /ban /warn /unban\n\n` +
      `*Filters*\n/addfilter /removefilter /listfilters\n\n` +
      `*Admin*\n/enable /disable /features\n/setwelcome /togglewelcome\n/list — Global listing\n/setpro — Activate PRO\n/botstatus /auditlog`,
      { parse_mode: 'Markdown' },
    );
  });

  return bot;
}
