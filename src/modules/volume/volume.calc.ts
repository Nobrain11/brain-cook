// src/modules/volume/volume.calc.ts

import { pricingService } from '../../services/pricing.service';
import { logger } from '../../utils/logger';
import type { VolumeSettings } from './volume.settings';
import type { VolumeSnapshot } from './volume.cache';

export interface VolumeResult {
  snapshot: VolumeSnapshot;
  crossedMilestones: number[];
}

export async function calcVolume(
  settings: VolumeSettings,
  previous: VolumeSnapshot | null,
  tokenAddress: string,
  chain: 'solana' | 'eth' | 'bsc' | 'base',
): Promise<VolumeResult | null> {
  try {
    const data = await pricingService.getVolumeWindows({ tokenAddress, chain });
    if (!data) {
      logger.warn('[volume.calc] No volume data returned', { chatId: settings.chatId });
      return null;
    }

    const snapshot: VolumeSnapshot = {
      volume5m: data.volume5m,
      volume1h: data.volume1h,
      volume24h: data.volume24h,
      fetchedAt: Date.now(),
    };

    const crossedMilestones = detectMilestoneCrossings(
      settings.milestones,
      previous?.volume24h ?? 0,
      snapshot.volume24h,
    );

    return { snapshot, crossedMilestones };
  } catch (err) {
    logger.error('[volume.calc] calcVolume threw', { chatId: settings.chatId, err });
    return null;
  }
}

function detectMilestoneCrossings(milestones: number[], prev: number, curr: number): number[] {
  if (curr <= prev) return [];
  return milestones.filter((m) => prev < m && curr >= m);
}

export function formatVolume(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(2)}`;
}
