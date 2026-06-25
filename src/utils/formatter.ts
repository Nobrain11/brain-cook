// src/utils/formatter.ts

import { CHAIN_EXPLORERS, BUY_EMOJI_TIERS } from './constants';
import type { Chain } from '../types/global';

export function formatUsd(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getTxUrl(chain: Chain, txHash: string): string {
  const base = CHAIN_EXPLORERS[chain] ?? '';
  return `${base}/${txHash}`;
}

export function getBuyEmoji(amountUsd: number): string {
  const tier = BUY_EMOJI_TIERS.find((t) => amountUsd >= t.minUsd);
  return tier?.emoji ?? '🐡';
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (char) => `\\${char}`);
}

export function formatTimestamp(ms: number): string {
  return new Date(ms).toUTCString();
}

export function pluralise(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}
