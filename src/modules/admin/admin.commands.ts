// src/modules/admin/admin.commands.ts

import type { Telegraf } from 'telegraf';
import type { BotContext, FeatureName } from '../../types/global';
import { requireAdmin } from '../../config/permissions';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { setFeatureEnabled, getGroupPlan, isFeatureEnabled } from './feature.toggle';
import { getRecentAuditLogs, formatAuditLogs, writeAuditLog } from './audit.log';
import { pricingService } from '../../services/pricing.service';

const ALL_FEATURES: FeatureName[] = [
  'raid', 'xfeed', 'buyalert', 'volume', 'mention',
  'moderation', 'rank', 'welcome', 'filters', 'listing',
];

export function registerAdminCommands(bot: Telegraf<BotContext>): void {

  // /enable <feature> — toggle a feature on
  bot.command('enable', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const feature = ctx.message.text.split(' ')[1] as FeatureName;
    if (!feature || !ALL_FEATURES.includes(feature)) {
      await ctx.reply(`Usage: /enable <feature>\nAvailable: ${ALL_FEATURES.join(', ')}`);
      return;
    }

    const chatId = String(ctx.chat.id);
    const ok = await setFeatureEnabled(chatId, feature, true);
    if (ok) {
      await writeAuditLog(chatId, String(ctx.from.id), 'ENABLE_FEATURE', { feature });
      await ctx.reply(`✅ Feature \`${feature}\` enabled.`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('❌ Failed to enable feature.');
    }
  });

  // /disable <feature> — toggle a feature off
  bot.command('disable', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const feature = ctx.message.text.split(' ')[1] as FeatureName;
    if (!feature || !ALL_FEATURES.includes(feature)) {
      await ctx.reply(`Usage: /disable <feature>\nAvailable: ${ALL_FEATURES.join(', ')}`);
      return;
    }

    const chatId = String(ctx.chat.id);
    const ok = await setFeatureEnabled(chatId, feature, false);
    if (ok) {
      await writeAuditLog(chatId, String(ctx.from.id), 'DISABLE_FEATURE', { feature });
      await ctx.reply(`✅ Feature \`${feature}\` disabled.`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('❌ Failed to disable feature.');
    }
  });

  // /features — show all feature states and current plan
  bot.command('features', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const chatId = String(ctx.chat.id);
    const plan = await getGroupPlan(chatId);

    const states = await Promise.all(
      ALL_FEATURES.map(async (f) => {
        const on = await isFeatureEnabled(chatId, f);
        return `${on ? '🟢' : '🔴'} \`${f}\``;
      }),
    );

    await ctx.reply(
      `⚙️ *Feature Status*\n` +
      `Plan: *${plan.toUpperCase()}*\n\n` +
      states.join('\n'),
      { parse_mode: 'Markdown' },
    );
  });

  // /auditlog — show recent admin actions
  bot.command('auditlog', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const chatId = String(ctx.chat.id);
    const logs = await getRecentAuditLogs(chatId);
    await ctx.reply(formatAuditLogs(logs), { parse_mode: 'Markdown' });
  });

  // /setpro <license_key> — upgrade group to PRO
  bot.command('setpro', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const key = ctx.message.text.split(' ')[1];
    if (!key) { await ctx.reply('Usage: /setpro <license_key>'); return; }

    const valid = pricingService.verifyProLicense(key);
    if (!valid) {
      await ctx.reply('❌ Invalid license key.');
      return;
    }

    const chatId = String(ctx.chat.id);
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    try {
      await prisma.group.upsert({
        where: { id: chatId },
        create: {
          id: chatId,
          title: ctx.chat.type !== 'private' ? (ctx.chat as { title?: string }).title ?? 'Unknown' : 'Unknown',
          plan: 'pro',
          planExpiry: expiry,
        },
        update: { plan: 'pro', planExpiry: expiry },
      });

      await writeAuditLog(chatId, String(ctx.from.id), 'UPGRADE_TO_PRO');
      await ctx.reply(`🚀 *PRO activated!*\nExpires: ${expiry.toDateString()}`, { parse_mode: 'Markdown' });
      logger.info('[admin] Group upgraded to PRO', { chatId });
    } catch (err) {
      logger.error('[admin] setpro failed', { chatId, err });
      await ctx.reply('❌ Failed to activate PRO.');
    }
  });

  // /botstatus — health check
  bot.command('botstatus', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const chatId = String(ctx.chat.id);
    const plan = await getGroupPlan(chatId);
    const token = await prisma.token.findUnique({ where: { chatId } });

    await ctx.reply(
      `🤖 *Bot Status*\n\n` +
      `Plan: *${plan.toUpperCase()}*\n` +
      `Token: ${token ? `*${token.symbol}* on ${token.chain}` : '❌ Not registered'}\n` +
      `Status: ✅ Online`,
      { parse_mode: 'Markdown' },
    );
  });
}
