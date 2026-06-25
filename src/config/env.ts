// src/config/env.ts
// Validates all required environment variables at startup.
// The app will not boot if any required variable is missing.

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Telegram
  BOT_TOKEN: z.string().min(10, 'BOT_TOKEN is required'),
  BOT_USERNAME: z.string().min(1, 'BOT_USERNAME is required'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),

  // Twitter / X
  TWITTER_BEARER_TOKEN: z.string().min(1, 'TWITTER_BEARER_TOKEN is required'),
  TWITTER_API_KEY: z.string().min(1),
  TWITTER_API_SECRET: z.string().min(1),
  TWITTER_ACCESS_TOKEN: z.string().min(1),
  TWITTER_ACCESS_SECRET: z.string().min(1),

  // Blockchain RPC
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_WS_URL: z.string(),
  ETH_RPC_URL: z.string().url(),
  ETH_WS_URL: z.string(),
  BSC_RPC_URL: z.string().url(),
  BSC_WS_URL: z.string(),
  BASE_RPC_URL: z.string().url(),
  BASE_WS_URL: z.string(),

  // Pricing
  BIRDEYE_API_KEY: z.string().min(1),
  COINGECKO_API_KEY: z.string().optional(),

  // Licensing
  PRO_LICENSE_SECRET: z.string().min(16),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.string().default('3000'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  • ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;
