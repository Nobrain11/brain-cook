// src/modules/filters/filter.rules.ts

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';

export type FilterType = 'keyword' | 'link' | 'regex';
export type FilterAction = 'delete' | 'mute' | 'ban';

export interface FilterRule {
  id: string;
  type: FilterType;
  value: string;
  action: FilterAction;
  enabled: boolean;
}

export async function getFilterRules(chatId: string): Promise<FilterRule[]> {
  try {
    const rows = await prisma.filterRule.findMany({
      where: { chatId, enabled: true },
    });
    return rows as FilterRule[];
  } catch (err) {
    logger.error('[filter.rules] getFilterRules failed', { chatId, err });
    return [];
  }
}

export async function addFilterRule(
  chatId: string,
  type: FilterType,
  value: string,
  action: FilterAction = 'delete',
): Promise<boolean> {
  try {
    await prisma.filterRule.upsert({
      where: { chatId_type_value: { chatId, type, value } },
      create: { chatId, type, value, action, enabled: true },
      update: { action, enabled: true },
    });
    return true;
  } catch (err) {
    logger.error('[filter.rules] addFilterRule failed', { chatId, type, value, err });
    return false;
  }
}

export async function removeFilterRule(chatId: string, id: string): Promise<boolean> {
  try {
    await prisma.filterRule.delete({ where: { id } });
    return true;
  } catch (err) {
    logger.error('[filter.rules] removeFilterRule failed', { chatId, id, err });
    return false;
  }
}

/**
 * Checks message text against all filter rules.
 * Returns the first matching rule or null.
 */
export function matchesFilterRule(text: string, rules: FilterRule[]): FilterRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.type === 'keyword') {
      if (text.toLowerCase().includes(rule.value.toLowerCase())) return rule;
    } else if (rule.type === 'link') {
      if (text.toLowerCase().includes(rule.value.toLowerCase())) return rule;
    } else if (rule.type === 'regex') {
      try {
        const re = new RegExp(rule.value, 'i');
        if (re.test(text)) return rule;
      } catch {
        // Invalid regex in DB — skip silently
      }
    }
  }

  return null;
}
