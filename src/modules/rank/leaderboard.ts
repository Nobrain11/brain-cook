// src/modules/rank/leaderboard.ts

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { LIMITS } from '../../config/limits';
import { getLevelFromXp } from './xp.service';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  xp: number;
  level: number;
}

export async function getLeaderboard(chatId: string): Promise<LeaderboardEntry[]> {
  try {
    const rows = await prisma.groupMember.findMany({
      where: { chatId },
      orderBy: { xp: 'desc' },
      take: LIMITS.rank.leaderboardSize,
    });

    return rows.map((row, i) => ({
      rank: i + 1,
      userId: row.userId,
      username: row.username,
      xp: row.xp,
      level: getLevelFromXp(row.xp),
    }));
  } catch (err) {
    logger.error('[leaderboard] getLeaderboard failed', { chatId, err });
    return [];
  }
}

export function formatLeaderboard(entries: LeaderboardEntry[]): string {
  if (entries.length === 0) return '📭 No XP data yet. Start chatting and raiding!';

  const medals = ['🥇', '🥈', '🥉'];

  const lines = entries.map((e) => {
    const medal = medals[e.rank - 1] ?? `${e.rank}.`;
    const name = e.username ? `@${e.username}` : `User ${e.userId}`;
    return `${medal} ${name} — *${e.xp} XP* (Lv.${e.level})`;
  });

  return `🏆 *Leaderboard*\n\n${lines.join('\n')}`;
}
