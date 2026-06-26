// src/modules/filters/filter.exempt.ts
// Users exempted from content filters (e.g. trusted members, admins).

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { resolveRole } from '../../config/permissions';
import type { BotContext } from '../../types/global';

export async function isExemptFromFilters(ctx: BotContext, userId: string): Promise<boolean> {
  // Admins and owners are always exempt
  const role = await resolveRole(ctx, parseInt(userId));
  if (role === 'admin' || role === 'owner') return true;

  // Check manual exempt list
  const chatId = String(ctx.chat?.id);
  try {
    const exempt = await prisma.filterExempt.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    return exempt !== null;
  } catch (err) {
    logger.warn('[filter.exempt] DB check failed', { chatId, userId, err });
    return false;
  }
}

export async function addFilterExempt(chatId: string, userId: string): Promise<boolean> {
  try {
    await prisma.filterExempt.upsert({
      where: { chatId_userId: { chatId, userId } },
      create: { chatId, userId },
      update: {},
    });
    return true;
  } catch (err) {
    logger.error('[filter.exempt] addFilterExempt failed', { chatId, userId, err });
    return false;
  }
}

export async function removeFilterExempt(chatId: string, userId: string): Promise<boolean> {
  try {
    await prisma.filterExempt.deleteMany({ where: { chatId, userId } });
    return true;
  } catch (err) {
    logger.error('[filter.exempt] removeFilterExempt failed', { chatId, userId, err });
    return false;
  }
}
