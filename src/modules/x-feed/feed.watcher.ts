// src/modules/x-feed/feed.watcher.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { scheduler } from '../../services/scheduler';
import { twitterService } from '../../services/twitter.service';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { isOriginalTweet, parseFeedTweet } from './feed.parser';
import { formatFeedMessage } from './feed.format';
import { updateLastTweetId } from './feed.settings';

const JOB_NAME = 'xfeed-watcher';
const CRON = '*/5 * * * *';

export function registerFeedWatcher(bot: Telegraf<BotContext>): void {
  scheduler.register(JOB_NAME, CRON, () => runFeedWatcher(bot));
  logger.info('[feed.watcher] Registered', { cron: CRON });
}

async function runFeedWatcher(bot: Telegraf<BotContext>): Promise<void> {
  let feeds: Array<{ id: string; chatId: string; xUsername: string; lastTweetId: string | null }>;

  try {
    feeds = await prisma.xFeed.findMany({ where: { enabled: true } });
  } catch (err) {
    logger.error('[feed.watcher] Failed to load feeds', { err });
    return;
  }

  await Promise.allSettled(feeds.map((feed) => processFeed(bot, feed)));
}

async function processFeed(
  bot: Telegraf<BotContext>,
  feed: { id: string; chatId: string; xUsername: string; lastTweetId: string | null },
): Promise<void> {
  try {
    const tweets = await twitterService.getLatestTweets(feed.xUsername, feed.lastTweetId ?? undefined);
    const originals = tweets.filter(isOriginalTweet);

    if (originals.length === 0) return;

    // Update last seen tweet ID
    await updateLastTweetId(feed.id, originals[0].id);

    for (const tweet of originals.reverse()) {
      const item = parseFeedTweet(tweet);
      const text = formatFeedMessage(item);

      await bot.telegram.sendMessage(feed.chatId, text, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      });
    }

    logger.info('[feed.watcher] Posted feed updates', { chatId: feed.chatId, username: feed.xUsername, count: originals.length });
  } catch (err) {
    logger.error('[feed.watcher] processFeed failed', { chatId: feed.chatId, username: feed.xUsername, err });
  }
}
