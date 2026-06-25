// src/utils/validator.ts

import { CHAINS } from './constants';
import type { Chain } from '../types/global';

export function isValidTweetUrl(url: string): boolean {
  return /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/i.test(url);
}

export function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match?.[1] ?? null;
}

export function isValidChain(value: string): value is Chain {
  return (CHAINS as readonly string[]).includes(value);
}

export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidTokenAddress(address: string, chain: Chain): boolean {
  if (chain === 'solana') return isValidSolanaAddress(address);
  return isValidEvmAddress(address);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidTelegramUsername(username: string): boolean {
  return /^@?[a-zA-Z0-9_]{5,32}$/.test(username);
}
