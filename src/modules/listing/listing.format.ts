// src/modules/listing/listing.format.ts

import type { Token } from '@prisma/client';

export function formatListingAnnouncement(token: Token, message: string): string {
  return (
    `📢 *Global Listing Announcement*\n\n` +
    `🪙 Token: *${token.name} (${token.symbol})*\n` +
    `⛓ Chain: \`${token.chain.toUpperCase()}\`\n` +
    `📍 CA: \`${token.address}\`\n\n` +
    `${message}\n\n` +
    (token.website ? `🌐 ${token.website}\n` : '') +
    (token.twitter ? `🐦 ${token.twitter}\n` : '')
  );
}
