// src/services/scheduler.ts
// Cron job registry wrapping node-cron.

import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger';

class Scheduler {
  private tasks = new Map<string, ScheduledTask>();

  register(name: string, expression: string, fn: () => Promise<void>): void {
    if (this.tasks.has(name)) {
      logger.warn('[scheduler] Job already registered — skipping', { name });
      return;
    }

    if (!cron.validate(expression)) {
      logger.error('[scheduler] Invalid cron expression', { name, expression });
      return;
    }

    const task = cron.schedule(expression, async () => {
      try {
        await fn();
      } catch (err) {
        logger.error('[scheduler] Job threw unhandled error', { name, err });
      }
    });

    this.tasks.set(name, task);
    logger.info('[scheduler] Job registered', { name, expression });
  }

  stop(name: string): void {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      this.tasks.delete(name);
      logger.info('[scheduler] Job stopped', { name });
    }
  }

  stopAll(): void {
    for (const [name, task] of this.tasks) {
      task.stop();
      logger.info('[scheduler] Job stopped', { name });
    }
    this.tasks.clear();
  }
}

export const scheduler = new Scheduler();
