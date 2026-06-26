// src/modules/welcome/welcome.format.ts

import type { User } from 'telegraf/types';

export function formatWelcomeMessage(template: string, user: User): string {
  const name = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
  const username = user.username ? `@${user.username}` : name;

  return template
    .replace(/{name}/g, name)
    .replace(/{username}/g, username)
    .replace(/{first}/g, user.first_name)
    .replace(/{id}/g, String(user.id));
}

export function buildWelcomeButtons(token: { website?: string | null; twitter?: string | null; telegram?: string | null } | null) {
  if (!token) return undefined;

  const buttons: Array<{ text: string; url: string }> = [];
  if (token.website) buttons.push({ text: '🌐 Website', url: token.website });
  if (token.twitter) buttons.push({ text: '🐦 Twitter', url: token.twitter });
  if (token.telegram) buttons.push({ text: '💬 Telegram', url: token.telegram });

  if (buttons.length === 0) return undefined;

  return { inline_keyboard: [buttons] };
}
