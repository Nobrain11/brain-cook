// src/modules/token/token.register.ts
// Solana-only token registration. Command: /settoken <address> <symbol> <name>

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { requireAdmin } from '../../config/permissions';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { validateTokenInput } from './token.validate';
import { formatTokenInfo, getTokenMeta } from './token.meta';
import { blockchainService } from '../../services/blockchain.service';

export function registerTokenCommands(bot: Telegraf<BotContext>): void {

  /**
   * /settoken <address> <symbol> <name>
   * Example: /settoken EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v USDC USD Coin
   * Chain is always Solana.
   */
  bot.command('settoken', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const parts = ctx.message.text.split(' ').slice(1);
    const [address, symbol, ...nameParts] = parts;
    const name = nameParts.join(' ');

    if (!address || !symbol || !name) {
      await ctx.reply(
        '❌ Usage: /settoken <address> <symbol> <name>\n\n' +
        'Example:\n`/settoken EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v USDC USD Coin`',
        { parse_mode: 'Markdown' },
      );
      return;
    }

    const validation = validateTokenInput({ address, symbol, name });
    if (!validation.valid) {
      await ctx.reply(`❌ ${validation.errors.join('\n')}`);
      return;
    }

    const chatId = String(ctx.chat.id);
    const chain = 'solana';

    try {
      await prisma.group.upsert({
        where: { id: chatId },
        create: {
          id: chatId,
          title: ctx.chat.type !== 'private'
            ? (ctx.chat as { title?: string }).title ?? 'Unknown'
            : 'Unknown',
        },
        update: {},
      });

      await prisma.token.upsert({
        where: { chatId },
        create: { chatId, address, chain, symbol: symbol.toUpperCase(), name },
        update: { address, chain, symbol: symbol.toUpperCase(), name },
      });

      blockchainService.watchToken(chain, address);

      await ctx.reply(
        `✅ *Token Registered!*\n\n` +
        `🪙 ${name} (${symbol.toUpperCase()})\n` +
        `⛓ Chain: Solana\n` +
        `📍 CA: \`${address}\``,
        { parse_mode: 'Markdown' },
      );

      logger.info('[token] Token registered', { chatId, address, symbol });
    } catch (err) {
      logger.error('[token] settoken failed', { chatId, err });
      await ctx.reply('❌ Failed to register token. Try again.');
    }
  });

  bot.command('token', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const token = await getTokenMeta(chatId);
    await ctx.reply(formatTokenInfo(token), { parse_mode: 'Markdown' });
  });

  bot.command('removetoken', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const chatId = String(ctx.chat.id);

    try {
      await prisma.token.deleteMany({ where: { chatId } });
      await ctx.reply('✅ Token removed.');
    } catch (err) {
      logger.error('[token] removetoken failed', { chatId, err });
      await ctx.reply('❌ Failed to remove token.');
    }
  });
}
