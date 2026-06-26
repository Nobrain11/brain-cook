// src/modules/token/token.meta.ts

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

export async function getTokenMeta(chatId: string) {
  try {
    return await prisma.token.findUnique({ where: { chatId } });
  } catch (err) {
    logger.error('[token.meta] getTokenMeta failed', { chatId, err });
    return null;
  }
}

export async function updateTokenMeta(
  chatId: string,
  patch: {
    symbol?: string;
    name?: string;
    website?: string | null;
    twitter?: string | null;
    telegram?: string | null;
  },
): Promise<boolean> {
  try {
    await prisma.token.update({ where: { chatId }, data: patch });
    return true;
  } catch (err) {
    logger.error('[token.meta] updateTokenMeta failed', { chatId, err });
    return false;
  }
}

export function formatTokenInfo(token: Awaited<ReturnType<typeof getTokenMeta>>): string {
  if (!token) return '❌ No token registered for this group.';

  const lines = [
    `🪙 *${token.name} (${token.symbol})*`,
    ``,
    `⛓ Chain: \`${token.chain.toUpperCase()}\``,
    `📍 Address: \`${token.address}\``,
  ];

  if (token.website) lines.push(`🌐 Website: ${token.website}`);
  if (token.twitter) lines.push(`🐦 Twitter: ${token.twitter}`);
  if (token.telegram) lines.push(`💬 Telegram: ${token.telegram}`);

  return lines.join('\n');
}
