// src/modules/filters/filter.commands.ts

import type { Telegraf } from 'telegraf';
import type { BotContext } from '../../types/global';
import { requireAdmin } from '../../config/permissions';
import { getFilterRules, addFilterRule, removeFilterRule } from './filter.rules';
import { addFilterExempt, removeFilterExempt } from './filter.exempt';
import { logger } from '../../utils/logger';
import type { FilterType, FilterAction } from './filter.rules';

export function registerFilterCommands(bot: Telegraf<BotContext>): void {

  /**
   * /addfilter <type> <action> <value>
   * type: keyword | link | regex
   * action: delete | mute | ban
   * Example: /addfilter keyword delete buy more
   */
  bot.command('addfilter', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;

    const parts = ctx.message.text.split(' ').slice(1);
    const type = parts[0] as FilterType;
    const action = parts[1] as FilterAction;
    const value = parts.slice(2).join(' ');

    if (!['keyword', 'link', 'regex'].includes(type) || !['delete', 'mute', 'ban'].includes(action) || !value) {
      await ctx.reply('Usage: /addfilter <keyword|link|regex> <delete|mute|ban> <value>');
      return;
    }

    const chatId = String(ctx.chat.id);
    const ok = await addFilterRule(chatId, type, value, action);
    await ctx.reply(ok ? `✅ Filter added: [${type}] "${value}" → ${action}` : '❌ Failed to add filter.');
  });

  bot.command('removefilter', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const id = ctx.message.text.split(' ')[1];
    if (!id) { await ctx.reply('Usage: /removefilter <rule_id>'); return; }

    const chatId = String(ctx.chat.id);
    const ok = await removeFilterRule(chatId, id);
    await ctx.reply(ok ? '✅ Filter removed.' : '❌ Failed to remove filter.');
  });

  bot.command('listfilters', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const chatId = String(ctx.chat.id);
    const rules = await getFilterRules(chatId);

    if (rules.length === 0) { await ctx.reply('No active filters.'); return; }

    const lines = rules.map((r) => `• [${r.type}] \`${r.value}\` → ${r.action} (ID: ${r.id})`).join('\n');
    await ctx.reply(`🚫 *Active Filters:*\n\n${lines}`, { parse_mode: 'Markdown' });
  });

  bot.command('exemptuser', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const reply = ctx.message.reply_to_message;
    if (!reply) { await ctx.reply('Reply to a user message to exempt them.'); return; }

    const chatId = String(ctx.chat.id);
    const userId = String(reply.from!.id);
    const ok = await addFilterExempt(chatId, userId);
    await ctx.reply(ok ? `✅ @${reply.from!.username ?? userId} exempted from filters.` : '❌ Failed.');
  });

  bot.command('unexemptuser', async (ctx) => {
    if (!(await requireAdmin(ctx))) return;
    const reply = ctx.message.reply_to_message;
    if (!reply) { await ctx.reply('Reply to a user message to remove exemption.'); return; }

    const chatId = String(ctx.chat.id);
    const userId = String(reply.from!.id);
    const ok = await removeFilterExempt(chatId, userId);
    await ctx.reply(ok ? `✅ Exemption removed for @${reply.from!.username ?? userId}.` : '❌ Failed.');
  });
}
