// src/modules/raid/raid.verify.ts

import { twitterService } from '../../services/twitter.service';
import { logger } from '../../utils/logger';

export interface VerifyResult {
  success: boolean;
  hasLiked: boolean;
  hasRetweeted: boolean;
  hasReplied: boolean;
  reason?: string;
}

/**
 * Verifies that a tweet exists and is reachable.
 * Full per-user engagement verification requires Twitter OAuth on behalf of users
 * (not available with bearer token). This checks tweet existence only and awards
 * XP on good faith — a common approach for Telegram bots.
 */
export async function verifyTweetExists(tweetId: string): Promise<boolean> {
  const tweet = await twitterService.getTweet(tweetId);
  return tweet !== null;
}

export async function verifyRaidCompletion(tweetId: string): Promise<VerifyResult> {
  try {
    const tweet = await twitterService.getTweet(tweetId);
    if (!tweet) {
      return { success: false, hasLiked: false, hasRetweeted: false, hasReplied: false, reason: 'Tweet not found.' };
    }

    // With bearer token only, we can confirm the tweet exists.
    // Flag as verified and award XP. Add OAuth user context if stricter verification needed.
    return {
      success: true,
      hasLiked: true,
      hasRetweeted: true,
      hasReplied: false,
    };
  } catch (err) {
    logger.error('[raid.verify] verifyRaidCompletion threw', { tweetId, err });
    return { success: false, hasLiked: false, hasRetweeted: false, hasReplied: false, reason: 'Verification service error.' };
  }
}
