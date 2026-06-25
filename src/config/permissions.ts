// src/config/permissions.ts
// Role resolution for Telegram group members.

import type { BotContext } from '../types/global';

export type Role = 'owner' | 'admin' | 'member';

/**
 * Resolves the role of a user in a given chat.
 * Returns 'owner' | 'admin' | 'member'.
 * Falls back to 'member' on any API error.
 */
export async function resolveRole(ctx: BotContext, userId: number): Promise<Role> {
  try {
    const chatId = ctx.chat?.id;
    if (!chatId) return 'member';

    const member = await ctx.telegram.getChatMember(chatId, userId);

    switch (member.status) {
      case 'creator':
        return 'owner';
      case 'administrator':
        return 'admin';
      default:
        return 'member';
    }
  } catch {
    return 'member';
  }
}

export function isAdmin(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}

export function isOwner(role: Role): boolean {
  return role === 'owner';
}

/**
 * Middleware helper — throws an error reply if the user is not admin.
 * Use inside command handlers: await requireAdmin(ctx);
 */
export async function requireAdmin(ctx: BotContext): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Could not identify user.');
    return false;
  }

  const role = await resolveRole(ctx, userId);
  if (!isAdmin(role)) {
    await ctx.reply('⛔ This command requires admin privileges.');
    return false;
  }

  return true;
}
