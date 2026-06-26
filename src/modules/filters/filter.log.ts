// src/modules/filters/filter.log.ts

import { logger } from '../../utils/logger';
import type { FilterRule } from './filter.rules';

export interface FilterHit {
  chatId: string;
  userId: string;
  username?: string;
  messageText: string;
  rule: FilterRule;
  actionTaken: string;
  timestamp: number;
}

/**
 * Logs a filter hit to the application logger.
 * Extend this to persist hits to DB or forward to an admin channel.
 */
export function logFilterHit(hit: FilterHit): void {
  logger.info('[filter.log] Filter hit', {
    chatId: hit.chatId,
    userId: hit.userId,
    username: hit.username,
    ruleType: hit.rule.type,
    ruleValue: hit.rule.value,
    action: hit.actionTaken,
    preview: hit.messageText.slice(0, 80),
  });
}
