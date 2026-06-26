// src/modules/admin/audit.log.ts

import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

export async function writeAuditLog(
  chatId: string,
  adminId: string,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { chatId, adminId, action, details: (details ?? {}) as Prisma.InputJsonValue },
    });
  } catch (err) {
    logger.warn('[audit.log] Failed to write audit log', { chatId, adminId, action, err });
  }
}

export async function getRecentAuditLogs(chatId: string, limit = 20) {
  try {
    return await prisma.auditLog.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch (err) {
    logger.error('[audit.log] getRecentAuditLogs failed', { chatId, err });
    return [];
  }
}

export function formatAuditLogs(logs: Awaited<ReturnType<typeof getRecentAuditLogs>>): string {
  if (logs.length === 0) return 'ð­ No audit logs yet.';

  const lines = logs.map((l) => {
    const ts = l.createdAt.toISOString().replace('T', ' ').slice(0, 19);
    return `â¢ \`${ts}\` [${l.action}] by \`${l.adminId}\``;
  });

  return `ð *Audit Log (last ${logs.length})*\n\n${lines.join('\n')}`;
}
