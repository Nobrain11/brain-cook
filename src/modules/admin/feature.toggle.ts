// src/modules/admin/feature.toggle.ts

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { isFeatureAvailable } from '../../config/features';
import type { FeatureName, PlanTier } from '../../types/global';

export async function isFeatureEnabled(chatId: string, feature: FeatureName): Promise<boolean> {
  try {
    const toggle = await prisma.featureToggle.findUnique({
      where: { chatId_feature: { chatId, feature } },
    });

    // If no row exists, default to enabled
    return toggle?.enabled ?? true;
  } catch (err) {
    logger.warn('[feature.toggle] isFeatureEnabled failed — defaulting to true', { chatId, feature, err });
    return true;
  }
}

export async function setFeatureEnabled(
  chatId: string,
  feature: FeatureName,
  enabled: boolean,
): Promise<boolean> {
  try {
    await prisma.featureToggle.upsert({
      where: { chatId_feature: { chatId, feature } },
      create: { chatId, feature, enabled },
      update: { enabled },
    });
    return true;
  } catch (err) {
    logger.error('[feature.toggle] setFeatureEnabled failed', { chatId, feature, err });
    return false;
  }
}

export async function getGroupPlan(chatId: string): Promise<PlanTier> {
  try {
    const group = await prisma.group.findUnique({ where: { id: chatId }, select: { plan: true, planExpiry: true } });
    if (!group) return 'free';

    if (group.plan === 'pro') {
      if (group.planExpiry && group.planExpiry < new Date()) return 'free'; // Expired
      return 'pro';
    }

    return 'free';
  } catch {
    return 'free';
  }
}

/**
 * Returns true if the feature is both toggled on AND available on the group's plan.
 */
export async function canUseFeature(chatId: string, feature: FeatureName): Promise<boolean> {
  const [enabled, tier] = await Promise.all([
    isFeatureEnabled(chatId, feature),
    getGroupPlan(chatId),
  ]);

  return enabled && isFeatureAvailable(feature, tier);
}
