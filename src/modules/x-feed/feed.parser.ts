// src/modules/x-feed/feed.parser.ts

import type { Tweet } from '../../services/twitter.service';

export interface ParsedFeedItem {
  tweetId: string;
  tweetUrl: string;
  authorUsername: string;
  text: string;
  createdAt: string;
}

export function parseFeedTweet(tweet: Tweet): ParsedFeedItem {
  return {
    tweetId: tweet.id,
    tweetUrl: `https://x.com/${tweet.authorUsername}/status/${tweet.id}`,
    authorUsername: tweet.authorUsername,
    text: tweet.text,
    createdAt: tweet.createdAt,
  };
}

export function isOriginalTweet(tweet: Tweet): boolean {
  return !tweet.isReply && !tweet.isRetweet;
}
