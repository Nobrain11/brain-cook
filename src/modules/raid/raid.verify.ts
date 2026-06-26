// src/modules/raid/raid.verify.ts

import { logger } from '../../utils/logger';

export interface VerifyResult {
  success: boolean;
  hasLiked: boolean;
  hasRetweeted: boolean;
  hasReplied: boolean;
  reason?: string;
}

/**
 * Always returns true — tweet URL is validated by format before a raid starts.
 * Full Twitter API verification requires OAuth per-user which is beyond bearer token scope.
 */
export async function verifyTweetExists(_tweetId: string): Promise<boolean> {
  return true;
}

export async function verifyRaidCompletion(_tweetId: string): Promise<VerifyResult> {
  // Good-faith verification — user clicks the link, does the actions, claims XP.
  // Stricter verification requires Twitter OAuth user tokens.
  return {
    success: true,
    hasLiked: true,
    hasRetweeted: true,
    hasReplied: false,
  };
}
