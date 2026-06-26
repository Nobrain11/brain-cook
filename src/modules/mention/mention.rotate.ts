// src/modules/mention/mention.rotate.ts

import { prisma } from '../../db/client';
import { LIMITS } from '../../config/limits';

/**
 * Returns a random selection of opted-in users for the given chat.
 * Excludes the calling user.
 */
export async function getRandomMentionTargets(
  chatId: string,
  excludeUserId: string,
  count: number = LIMITS.mention.maxTagsPerMessage,
): Promise<Array<{ userId: string; username: string | null }>> {
  const all = await prisma.mentionOptIn.findMany({
    where: { chatId, userId: { not: excludeUserId } },
    select: { userId: true, username: true },
  });

  if (all.length === 0) return [];

  // Fisher-Yates shuffle, take first `count`
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.slice(0, count);
}
