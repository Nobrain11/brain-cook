// src/db/seeds.ts
// Run with: npx ts-node src/db/seeds.ts

import { prisma } from './client';
import { logger } from '../utils/logger';

async function seed() {
  logger.info('[seed] Starting database seed...');

  // Example: seed a test group
  const group = await prisma.group.upsert({
    where: { id: '-1001234567890' },
    update: {},
    create: {
      id: '-1001234567890',
      title: 'Test Crypto Group',
      plan: 'pro',
    },
  });

  logger.info('[seed] Group upserted', { id: group.id });

  // Seed default feature toggles for the group
  const features = ['raid', 'xfeed', 'buyalert', 'volume', 'mention', 'moderation', 'rank', 'welcome', 'filters'];

  for (const feature of features) {
    await prisma.featureToggle.upsert({
      where: { chatId_feature: { chatId: group.id, feature } },
      update: {},
      create: { chatId: group.id, feature, enabled: true },
    });
  }

  logger.info('[seed] Feature toggles seeded');

  // Seed moderation settings
  await prisma.moderationSettings.upsert({
    where: { chatId: group.id },
    update: {},
    create: {
      chatId: group.id,
      spamEnabled: true,
      linkGuardEnabled: true,
      captchaEnabled: false,
      autoMuteEnabled: true,
      autoBanEnabled: false,
    },
  });

  // Seed welcome settings
  await prisma.welcomeSettings.upsert({
    where: { chatId: group.id },
    update: {},
    create: {
      chatId: group.id,
      enabled: true,
      message: '👋 Welcome to the group, {name}! Read the rules and enjoy your stay.',
    },
  });

  logger.info('[seed] Done ✅');
}

seed()
  .catch((err) => {
    logger.error('[seed] Failed', { err });
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
