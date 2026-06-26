// src/modules/raid/raid.rewards.ts

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { LIMITS } from '../../config/limits';

export async function awardRaidXp(
  chatId: string,
  userId: string,
  username: string | undefined,
  sessionId: string,
): Promise<number> {
  const xp = LIMITS.rank.xpPerRaid;

  try {
    await prisma.$transaction([
      prisma.groupMember.upsert({
        where: { chatId_userId: { chatId, userId } },
        create: { chatId, userId, username, xp, level: 1 },
        update: { xp: { increment: xp }, username },
      }),
      prisma.raidCompletion.updateMany({
        where: { sessionId, userId },
        data: { xpAwarded: xp },
      }),
    ]);

    return xp;
  } catch (err) {
    logger.error('[raid.rewards] awardRaidXp failed', { chatId, userId, err });
    return 0;
  }
}
