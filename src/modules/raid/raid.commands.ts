// src/modules/raid/raid.commands.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { requireAdmin } from '../../config/permissions';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { isValidTweetUrl, extractTweetId } from '../../utils/validator';
import { verifyTweetExists, verifyRaidCompletion } from './raid.verify';
import { isRaidOnCooldown, setRaidCooldown, getRaidCooldownRemaining } from './raid.cooldown';
import { awardRaidXp } from './raid.rewards';
import { LIMITS } from '../../config/limits';

export function registerRaidCommands(bot: Telegraf<BotContext>): void {

  bot.command('raid', async (ctx) => {
    try {
      if (!(await requireAdmin(ctx))) return;

      const args = ctx.message.text.split(' ').slice(1);
      const tweetUrl = args[0];

      if (!tweetUrl || !isValidTweetUrl(tweetUrl)) {
        await ctx.reply('❌ Usage: /raid <tweet_url>\nExample: /raid https://x.com/user/status/123456789');
        return;
      }

      const tweetId = extractTweetId(tweetUrl);
      if (!tweetId) {
        await ctx.reply('❌ Could not parse tweet ID from URL.');
        return;
      }

      const chatId = String(ctx.chat.id);

      const existing = await prisma.raidSession.findFirst({
        where: { chatId, active: true },
      });
      if (existing) {
        await ctx.reply('⚠️ A raid is already active. Use /endraid to close it first.');
        return;
      }

      const exists = await verifyTweetExists(tweetId);
      if (!exists) {
        await ctx.reply('❌ Could not find that tweet. Check the URL and try again.');
        return;
      }

      const endsAt = new Date(Date.now() + LIMITS.raid.verifyWindowMs);

      await prisma.raidSession.create({
        data: {
          chatId,
          tweetId,
          tweetUrl,
          startedBy: String(ctx.from.id),
          active: true,
          endsAt,
        },
      });

      await ctx.reply(
        `🐦 *Raid Started!*\n\n` +
        `👉 [Open Tweet](${tweetUrl})\n\n` +
        `Like, Retweet, and Comment — then use /verify to claim your XP!\n\n` +
        `⏱ Raid closes in 30 minutes.`,
        { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } },
      );

      logger.info('[raid] Raid started', { chatId, tweetId, by: ctx.from.id });
    } catch (err) {
      logger.error('[raid] /raid command failed', { err });
      await ctx.reply('❌ Failed to start raid. Please try again.');
    }
  });

  bot.command('verify', async (ctx) => {
    try {
      const chatId = String(ctx.chat.id);
      const userId = String(ctx.from.id);
      const username = ctx.from.username;

      const session = await prisma.raidSession.findFirst({
        where: { chatId, active: true },
      });

      if (!session) {
        await ctx.reply('ℹ️ No active raid at the moment.');
        return;
      }

      if (await isRaidOnCooldown(chatId, userId)) {
        const remaining = await getRaidCooldownRemaining(chatId, userId);
        const mins = Math.ceil(remaining / 60000);
        await ctx.reply(`⏳ You already verified recently. Try again in ~${mins} minute(s).`);
        return;
      }

      const existing = await prisma.raidCompletion.findUnique({
        where: { sessionId_userId: { sessionId: session.id, userId } },
      });
      if (existing?.verified) {
        await ctx.reply('✅ You already completed this raid!');
        return;
      }

      const result = await verifyRaidCompletion(session.tweetId);
      if (!result.success) {
        await ctx.reply(`❌ Verification failed: ${result.reason}`);
        return;
      }

      await prisma.raidCompletion.upsert({
        where: { sessionId_userId: { sessionId: session.id, userId } },
        create: { sessionId: session.id, userId, username, verified: true },
        update: { verified: true, username },
      });

      const xp = await awardRaidXp(chatId, userId, username, session.id);
      await setRaidCooldown(chatId, userId);

      const name = ctx.from.first_name ?? username ?? 'Raider';
      await ctx.reply(`✅ *${name}* verified the raid! +${xp} XP 🎉`, { parse_mode: 'Markdown' });

      logger.info('[raid] Raid verified', { chatId, userId, sessionId: session.id });
    } catch (err) {
      logger.error('[raid] /verify command failed', { err });
      await ctx.reply('❌ Verification error. Try again shortly.');
    }
  });

  bot.command('endraid', async (ctx) => {
    try {
      if (!(await requireAdmin(ctx))) return;

      const chatId = String(ctx.chat.id);
      const session = await prisma.raidSession.findFirst({
        where: { chatId, active: true },
        include: { completions: true },
      });

      if (!session) {
        await ctx.reply('ℹ️ No active raid to end.');
        return;
      }

      await prisma.raidSession.update({
        where: { id: session.id },
        data: { active: false, completedAt: new Date() },
      });

      const count = session.completions.filter((c) => c.verified).length;
      await ctx.reply(`🏁 Raid ended! *${count}* raiders completed it.`, { parse_mode: 'Markdown' });

      logger.info('[raid] Raid ended', { chatId, sessionId: session.id, completions: count });
    } catch (err) {
      logger.error('[raid] /endraid command failed', { err });
    }
  });

  bot.command('raidstats', async (ctx) => {
    try {
      const chatId = String(ctx.chat.id);
      const session = await prisma.raidSession.findFirst({
        where: { chatId, active: true },
        include: { completions: { where: { verified: true } } },
      });

      if (!session) {
        await ctx.reply('ℹ️ No active raid.');
        return;
      }

      const count = session.completions.length;
      const top = session.completions.slice(0, 5).map((c, i) => `${i + 1}. @${c.username ?? c.userId}`).join('\n');

      await ctx.reply(
        `📊 *Active Raid Stats*\n\n` +
        `✅ Verified: ${count}\n\n` +
        (top ? `👑 Top Raiders:\n${top}` : ''),
        { parse_mode: 'Markdown' },
      );
    } catch (err) {
      logger.error('[raid] /raidstats failed', { err });
    }
  });
}
