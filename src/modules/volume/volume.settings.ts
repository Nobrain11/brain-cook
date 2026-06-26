// src/modules/volume/volume.settings.ts

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

export interface VolumeSettings {
  chatId: string;
  enabled: boolean;
  milestones: number[];
  announcementChannelId: string | null;
}

const DEFAULT_MILESTONES = [10_000, 50_000, 100_000, 500_000, 1_000_000];

export async function getVolumeSettings(chatId: string): Promise<VolumeSettings | null> {
  try {
    const row = await prisma.volumeSettings.findUnique({ where: { chatId } });
    if (!row) return null;
    return {
      chatId: row.chatId,
      enabled: row.enabled,
      milestones: (row.milestones as number[]) ?? DEFAULT_MILESTONES,
      announcementChannelId: row.announcementChannelId,
    };
  } catch (err) {
    logger.error('[volume.settings] getVolumeSettings failed', { chatId, err });
    return null;
  }
}

export async function upsertVolumeSettings(
  chatId: string,
  patch: Partial<Omit<VolumeSettings, 'chatId'>>,
): Promise<boolean> {
  try {
    await prisma.volumeSettings.upsert({
      where: { chatId },
      create: {
        chatId,
        enabled: patch.enabled ?? false,
        milestones: patch.milestones ?? DEFAULT_MILESTONES,
        announcementChannelId: patch.announcementChannelId ?? null,
      },
      update: patch,
    });
    return true;
  } catch (err) {
    logger.error('[volume.settings] upsertVolumeSettings failed', { chatId, err });
    return false;
  }
}
