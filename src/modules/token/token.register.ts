// src/modules/token/token.register.ts

import type { Telegraf } from 'telegraf';
import type { BotContext, Chain } from '../../types/global';
import { requireAdmin } from '../../config/permissions';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { validateTokenInput } from './token.validate';
import { formatTokenInfo, getTokenMeta } from './token.meta';
import { blockchainService } from '../../services/blockchain.service';
import { isValidChain } from '../../utils/validator';

export function registerTokenCommands(bot: Telegraf<BotContext>): void {

  /**
   * /settoken <address> <chain> <symbol> <name>
   * Example: /settoken So11111... solana SOL Solana
   */
  bot.command('settoken', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const parts = ctx.message.text.split(' ').slice(1);
    const [address, chain, symbol, ...nameParts] = parts;
    const name = nameParts.join(' ');

    const validation = validateTokenInput({ address, chain: chain as Chain, symbol, name });
    if (!validation.valid) {
      await ctx.reply(`❌ Invalid token details:\n${validation.errors.map((e) => `• ${e}`).join('\n')}\n\nUsage: /settoken <address> <chain> <symbol> <name>`);
      return;
    }

    if (!isValidChain(chain)) {
      await ctx.reply('❌ Invalid chain. Use: solana, eth, bsc, base');
      return;
    }

    const chatId = String(ctx.chat.id);

    try {
      // Ensure group exists
      await prisma.group.upsert({
        where: { id: chatId },
        create: { id: chatId, title: ctx.chat.type !== 'private' ? (ctx.chat as { title?: string }).title ?? 'Unknown' : 'Unknown' },
        update: {},
      });

      await prisma.token.upsert({
        where: { chatId },
        create: { chatId, address, chain, symbol: symbol.toUpperCase(), name },
        update: { address, chain, symbol: symbol.toUpperCase(), name },
      });

      // Register with blockchain listener
      blockchainService.watchToken(chain as Chain, address);

      await ctx.reply(
        `✅ Token registered!\n\n` +
        `🪙 *${name} (${symbol.toUpperCase()})*\n` +
        `⛓ Chain: \`${chain.toUpperCase()}\`\n` +
        `📍 Address: \`${address}\``,
        { parse_mode: 'Markdown' },
      );

      logger.info('[token] Token registered', { chatId, address, chain, symbol });
    } catch (err) {
      logger.error('[token] settoken failed', { chatId, err });
      await ctx.reply('❌ Failed to register token.');
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
