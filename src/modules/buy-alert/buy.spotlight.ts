// src/modules/buy-alert/buy.spotlight.ts

import type { Telegraf } from 'telegraf';
import type { BotContext, BuyEvent } from '../../types/global';
import { pricingService } from '../../services/pricing.service';
import { formatUsd } from '../../utils/formatter';
import { logger } from '../../utils/logger';

export async function postSpotlight(
  bot: Telegraf<BotContext>,
  chatId: string,
  event: BuyEvent,
  replyToMessageId: number,
): Promise<void> {
  try {
    const price = await pricingService.getTokenPrice(event.tokenAddress, event.chain);
    if (!price) return;

    const text =
      `📈 *Token Spotlight*\n\n` +
      `💲 Price: *${formatUsd(price.priceUsd)}*\n` +
      `📊 24h Change: *${price.priceChange24h >= 0 ? '+' : ''}${price.priceChange24h.toFixed(2)}%*\n` +
      `🏦 Market Cap: *${formatUsd(price.marketCapUsd)}*`;

    await bot.telegram.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_parameters: { message_id: replyToMessageId },
    });
  } catch (err) {
    logger.warn('[buy.spotlight] Failed to post spotlight', { chatId, err });
  }
}
