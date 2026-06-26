// src/modules/buy-alert/buy.listener.ts

import type { Telegraf } from 'telegraf';
import type { BotContext, BuyEvent } from '../../types/global';
import { blockchainService } from '../../services/blockchain.service';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { formatBuyAlert } from './buy.format';
import { buildBuyButtons } from './buy.buttons';
import { postSpotlight } from './buy.spotlight';
import { LIMITS } from '../../config/limits';

export function registerBuyListener(bot: Telegraf<BotContext>): void {
  blockchainService.onBuy(async (event) => {
    await handleBuyEvent(bot, event);
  });
  logger.info('[buy.listener] Buy event listener registered');
}

async function handleBuyEvent(bot: Telegraf<BotContext>, event: BuyEvent): Promise<void> {
  try {
    // Find all groups watching this token
    const tokens = await prisma.token.findMany({
      where: { address: event.tokenAddress, chain: event.chain },
      select: { chatId: true },
    });

    if (tokens.length === 0) return;

    await Promise.allSettled(tokens.map((t) => postBuyAlert(bot, t.chatId, event)));
  } catch (err) {
    logger.error('[buy.listener] handleBuyEvent failed', { err });
  }
}

async function postBuyAlert(bot: Telegraf<BotContext>, chatId: string, event: BuyEvent): Promise<void> {
  try {
    const settings = await prisma.buyAlertSettings.findUnique({ where: { chatId } });
    if (!settings || !settings.enabled) return;
    if (event.amountUsd < settings.minBuyUsd) return;

    const targetChatId = settings.announcementChatId ?? chatId;
    const text = formatBuyAlert(event);
    const buttons = buildBuyButtons(event);

    let sentMessage: { message_id: number } | null = null;

    if (settings.mediaUrl && settings.mediaType) {
      sentMessage = await sendMediaAlert(bot, targetChatId, settings.mediaUrl, settings.mediaType, text, buttons);
    } else {
      sentMessage = await bot.telegram.sendMessage(targetChatId, text, {
        parse_mode: 'Markdown',
        reply_markup: buttons,
      });
    }

    if (settings.autoPinEnabled && sentMessage) {
      await bot.telegram.pinChatMessage(targetChatId, sentMessage.message_id).catch(() => null);
    }

    if (settings.spotlightEnabled && sentMessage) {
      setTimeout(async () => {
        await postSpotlight(bot, targetChatId, event, sentMessage!.message_id).catch(() => null);
      }, LIMITS.buyAlert.spotlightDelayMs);
    }

    logger.info('[buy.listener] Buy alert posted', { chatId, amountUsd: event.amountUsd });
  } catch (err) {
    logger.error('[buy.listener] postBuyAlert failed', { chatId, err });
  }
}

async function sendMediaAlert(
  bot: Telegraf<BotContext>,
  chatId: string,
  mediaUrl: string,
  mediaType: string,
  caption: string,
  buttons: ReturnType<typeof buildBuyButtons>,
): Promise<{ message_id: number }> {
  const opts = { caption, parse_mode: 'Markdown' as const, reply_markup: buttons };

  if (mediaType === 'video') return bot.telegram.sendVideo(chatId, mediaUrl, opts);
  if (mediaType === 'gif') return bot.telegram.sendAnimation(chatId, mediaUrl, opts);
  return bot.telegram.sendPhoto(chatId, mediaUrl, opts);
}
