// src/modules/buy-alert/buy.settings.ts

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { LIMITS } from '../../config/limits';

export async function getBuyAlertSettings(chatId: string) {
  return prisma.buyAlertSettings.findUnique({ where: { chatId } });
}

export async function upsertBuyAlertSettings(
  chatId: string,
  patch: {
    enabled?: boolean;
    minBuyUsd?: number;
    mediaUrl?: string | null;
    mediaType?: string | null;
    autoPinEnabled?: boolean;
    spotlightEnabled?: boolean;
    announcementChatId?: string | null;
  },
): Promise<boolean> {
  try {
    await prisma.buyAlertSettings.upsert({
      where: { chatId },
      create: {
        chatId,
        enabled: patch.enabled ?? false,
        minBuyUsd: patch.minBuyUsd ?? LIMITS.buyAlert.minBuyUsd,
        mediaUrl: patch.mediaUrl ?? null,
        mediaType: patch.mediaType ?? null,
        autoPinEnabled: patch.autoPinEnabled ?? false,
        spotlightEnabled: patch.spotlightEnabled ?? true,
        announcementChatId: patch.announcementChatId ?? null,
      },
      update: patch,
    });
    return true;
  } catch (err) {
    logger.error('[buy.settings] upsertBuyAlertSettings failed', { chatId, err });
    return false;
  }
}
