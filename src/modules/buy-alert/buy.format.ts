// src/modules/buy-alert/buy.format.ts

import type { BuyEvent } from '../../types/global';
import { formatUsd, formatNumber, shortenAddress, getBuyEmoji, getTxUrl } from '../../utils/formatter';
import { CHAIN_LABELS } from '../../utils/constants';

export function formatBuyAlert(event: BuyEvent): string {
  const emoji = getBuyEmoji(event.amountUsd);
  const chain = CHAIN_LABELS[event.chain] ?? event.chain.toUpperCase();
  const txUrl = getTxUrl(event.chain, event.txHash);
  const buyer = shortenAddress(event.buyerAddress);

  return (
    `${emoji} *New Buy!*\n\n` +
    `💰 Amount: *${formatUsd(event.amountUsd)}*\n` +
    `🪙 Tokens: *${formatNumber(Math.floor(event.amountToken))}*\n` +
    `💲 Price: *${formatUsd(event.priceUsd)}*\n` +
    `⛓ Chain: ${chain}\n` +
    `👛 Buyer: \`${buyer}\`\n\n` +
    `🔗 [View Tx](${txUrl})`
  );
}
