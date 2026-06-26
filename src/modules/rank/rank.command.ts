// src/modules/rank/rank.command.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { getLevelFromXp, getXpForNextLevel } from './xp.service';
import { getLeaderboard, formatLeaderboard } from './leaderboard';

export function registerRankCommands(bot: Telegraf<BotContext>): void {

  bot.command('rank', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const userId = String(ctx.from.id);

    try {
      const member = await prisma.groupMember.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });

      if (!member) {
        await ctx.reply('📭 No XP yet! Start chatting to earn experience.');
        return;
      }

      const level = getLevelFromXp(member.xp);
      const nextLevelXp = getXpForNextLevel(member.xp);
      const progressNeeded = nextLevelXp - member.xp;

      // Get rank position
      const rankRow = await prisma.groupMember.count({
        where: { chatId, xp: { gt: member.xp } },
      });
      const position = rankRow + 1;

      const name = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

      await ctx.reply(
        `🏅 *${name}'s Rank*\n\n` +
        `⭐ Level: *${level}*\n` +
        `✨ XP: *${member.xp}*\n` +
        `📈 Rank: *#${position}*\n` +
        `🎯 Next level in: *${progressNeeded} XP*`,
        { parse_mode: 'Markdown' },
      );
    } catch (err) {
      logger.error('[rank] /rank failed', { chatId, userId, err });
      await ctx.reply('❌ Could not fetch rank.');
    }
  });

  bot.command('leaderboard', async (ctx) => {
    const chatId = String(ctx.chat.id);

    try {
      const entries = await getLeaderboard(chatId);
      const text = formatLeaderboard(entries);
      await ctx.reply(text, { parse_mode: 'Markdown' });
    } catch (err) {
      logger.error('[rank] /leaderboard failed', { chatId: String(ctx.chat.id), err });
      await ctx.reply('❌ Could not fetch leaderboard.');
    }
  });
}
