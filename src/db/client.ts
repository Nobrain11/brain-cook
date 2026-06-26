// src/db/client.ts

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // Prevent multiple instances in dev hot-reload
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });
}

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

prisma.$on('warn' as never, (e: { message: string }) => {
  logger.warn('[prisma]', { message: e.message });
});

prisma.$on('error' as never, (e: { message: string }) => {
  logger.error('[prisma]', { message: e.message });
});

export async function connectDb(): Promise<void> {
  await prisma.$connect();
  logger.info('[db] PostgreSQL connected');
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  logger.info('[db] PostgreSQL disconnected');
}
