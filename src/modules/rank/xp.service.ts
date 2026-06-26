// src/modules/rank/xp.service.ts

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { LIMITS } from '../../config/limits';

const XP_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000];

export function getLevelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, XP_THRESHOLDS.length);
}

export function getXpForNextLevel(currentXp: number): number {
  const level = getLevelFromXp(currentXp);
  return XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
}

export async function awardXp(
  chatId: string,
  userId: string,
  username: string | undefined,
  xp: number,
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  try {
    const existing = await prisma.groupMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });

    const prevLevel = existing ? getLevelFromXp(existing.xp) : 1;

    const member = await prisma.groupMember.upsert({
      where: { chatId_userId: { chatId, userId } },
      create: { chatId, userId, username, xp, level: 1 },
      update: { xp: { increment: xp }, username },
    });

    const newLevel = getLevelFromXp(member.xp);
    const leveledUp = newLevel > prevLevel;

    if (leveledUp) {
      await prisma.groupMember.update({
        where: { chatId_userId: { chatId, userId } },
        data: { level: newLevel },
      });
    }

    return { newXp: member.xp, newLevel, leveledUp };
  } catch (err) {
    logger.error('[xp.service] awardXp failed', { chatId, userId, err });
    return { newXp: 0, newLevel: 1, leveledUp: false };
  }
}

export async function awardMessageXp(
  chatId: string,
  userId: string,
  username: string | undefined,
): Promise<{ leveledUp: boolean; newLevel: number }> {
  const result = await awardXp(chatId, userId, username, LIMITS.rank.xpPerMessage);
  return { leveledUp: result.leveledUp, newLevel: result.newLevel };
}
