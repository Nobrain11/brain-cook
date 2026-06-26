// src/modules/x-feed/feed.format.ts

import type { ParsedFeedItem } from './feed.parser';

export function formatFeedMessage(item: ParsedFeedItem): string {
  return (
    `🧵 *New post from @${item.authorUsername}*\n\n` +
    `${item.text}\n\n` +
    `🔗 [View on X](${item.tweetUrl})\n\n` +
    `💥 Like, RT & Comment to support the community!`
  );
}
