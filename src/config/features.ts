// src/config/features.ts
// Defines which features are PRO-only and provides a gating helper.

import type { FeatureName, PlanTier } from '../types/global';

/** Features that require PRO tier */
export const PRO_FEATURES: Set<FeatureName> = new Set([
  'xfeed',
  'buyalert',
  'volume',
  'listing',
]);

/** Features available on FREE tier */
export const FREE_FEATURES: Set<FeatureName> = new Set([
  'raid',
  'mention',
  'moderation',
  'rank',
  'welcome',
  'filters',
]);

export function isFeatureAvailable(feature: FeatureName, tier: PlanTier): boolean {
  if (tier === 'pro') return true;
  return FREE_FEATURES.has(feature);
}

export function getRequiredTier(feature: FeatureName): PlanTier {
  return PRO_FEATURES.has(feature) ? 'pro' : 'free';
}
