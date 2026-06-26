// src/modules/buy-alert/buy.parser.ts
// Parses raw on-chain swap data into a normalised BuyEvent.
// Called by blockchain.service after ABI decoding.

import type { BuyEvent, Chain } from '../../types/global';

export interface RawSwapData {
  chain: Chain;
  txHash: string;
  tokenAddress: string;
  buyerAddress: string;
  tokenAmount: number;
  usdAmount: number;
  tokenPriceUsd: number;
  timestamp?: number;
}

export function parseBuyEvent(raw: RawSwapData): BuyEvent {
  return {
    chain: raw.chain,
    txHash: raw.txHash,
    tokenAddress: raw.tokenAddress,
    buyerAddress: raw.buyerAddress,
    amountToken: raw.tokenAmount,
    amountUsd: raw.usdAmount,
    priceUsd: raw.tokenPriceUsd,
    timestamp: raw.timestamp ?? Date.now(),
  };
}

export function isBuyTransaction(data: RawSwapData): boolean {
  // Only alert on buys — reject sells (negative tokenAmount or negative usd)
  return data.usdAmount > 0 && data.tokenAmount > 0;
}
