// src/types/global.d.ts

import type { Context, NarrowedContext } from 'telegraf';
import type { Update, Message, CallbackQuery } from 'telegraf/types';

// ─── Bot Context ──────────────────────────────────────────────────────────────

export interface SessionData {
  step?: string;
  data?: Record<string, unknown>;
}

export interface BotContext extends Context {
  session?: SessionData;
}

export type MessageContext = NarrowedContext<BotContext, Update.MessageUpdate>;
export type CallbackContext = NarrowedContext<BotContext, Update.CallbackQueryUpdate>;
export type TextMessage = Message.TextMessage;

// ─── Chain Types ─────────────────────────────────────────────────────────────

export type Chain = 'solana' | 'eth' | 'bsc' | 'base';

// ─── Feature Names ───────────────────────────────────────────────────────────

export type FeatureName =
  | 'raid'
  | 'xfeed'
  | 'buyalert'
  | 'volume'
  | 'mention'
  | 'moderation'
  | 'rank'
  | 'welcome'
  | 'filters'
  | 'listing';

// ─── Plan Tiers ──────────────────────────────────────────────────────────────

export type PlanTier = 'free' | 'pro';

// ─── Buy Event (emitted by blockchain.service) ───────────────────────────────

export interface BuyEvent {
  chain: Chain;
  txHash: string;
  tokenAddress: string;
  buyerAddress: string;
  amountToken: number;
  amountUsd: number;
  priceUsd: number;
  timestamp: number;
}

// ─── Volume Windows ──────────────────────────────────────────────────────────

export interface VolumeWindows {
  volume5m: number;
  volume1h: number;
  volume24h: number;
}

// ─── Prisma Helpers ──────────────────────────────────────────────────────────

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}
