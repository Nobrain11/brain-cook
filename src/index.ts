// src/index.ts
import 'dotenv/config';
import { env } from './config/env';
import { logger } from './utils/logger';
import { connectDb, disconnectDb } from './db/client';
import { cache } from './services/cache.service';
import { blockchainService } from './services/blockchain.service';
import { scheduler } from './services/scheduler';
import { createBot } from './bot';

async function main(): Promise<void> {
  logger.info('🚀 Starting Telegram SuperBot...', { env: env.NODE_ENV });

  // 1. Database
  await connectDb();

  // 2. Cache (Redis with in-memory fallback)
  await cache.connect();

  // 3. Blockchain WebSocket listeners
  blockchainService.connectAll();

  // 4. Create & launch bot
  const bot = createBot();

  // 5. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`[index] Received ${signal} — shutting down gracefully`);
    try {
      bot.stop(signal);
      scheduler.stopAll();
      blockchainService.disconnectAll();
      await cache.disconnect();
      await disconnectDb();
      logger.info('[index] Shutdown complete ✅');
      process.exit(0);
    } catch (err) {
      logger.error('[index] Shutdown error', { err });
      process.exit(1);
    }
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  // 6. Launch
  await bot.launch();
  logger.info(`✅ Bot @${env.BOT_USERNAME} is live`);
}

main().catch((err) => {
  logger.error('[index] Fatal startup error', { err });
  process.exit(1);
});
