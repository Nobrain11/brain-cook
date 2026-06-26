// src/modules/buy-alert/buy.buttons.ts

import type { BuyEvent, Chain } from '../../types/global';

const DEX_LINKS: Record<Chain, (addr: string) => string> = {
  solana: (addr) => `https://raydium.io/swap/?inputCurrency=sol&outputCurrency=${addr}`,
  eth: (addr) => `https://app.uniswap.org/swap?outputCurrency=${addr}`,
  bsc: (addr) => `https://pancakeswap.finance/swap?outputCurrency=${addr}`,
  base: (addr) => `https://app.uniswap.org/swap?chain=base&outputCurrency=${addr}`,
};

const CHART_LINKS: Record<Chain, (addr: string) => string> = {
  solana: (addr) => `https://birdeye.so/token/${addr}`,
  eth: (addr) => `https://www.dextools.io/app/ether/pair-explorer/${addr}`,
  bsc: (addr) => `https://www.dextools.io/app/bnb/pair-explorer/${addr}`,
  base: (addr) => `https://www.dextools.io/app/base/pair-explorer/${addr}`,
};

export function buildBuyButtons(event: BuyEvent) {
  const buyLink = DEX_LINKS[event.chain]?.(event.tokenAddress) ?? '#';
  const chartLink = CHART_LINKS[event.chain]?.(event.tokenAddress) ?? '#';

  return {
    inline_keyboard: [
      [
        { text: '🛒 Buy', url: buyLink },
        { text: '📊 Chart', url: chartLink },
      ],
    ],
  };
}
