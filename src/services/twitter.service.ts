// src/services/twitter.service.ts
// X (Twitter) API v2 abstraction.

import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: string;
  isReply: boolean;
  isRetweet: boolean;
  referencedTweetId?: string;
}

export interface TweetEngagement {
  likeCount: number;
  retweetCount: number;
  replyCount: number;
}

export interface UserEngagement {
  hasLiked: boolean;
  hasRetweeted: boolean;
  hasReplied: boolean;
}

class TwitterService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.twitter.com/2',
      headers: {
        Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}`,
      },
      timeout: 10_000,
    });
  }

  async getTweet(tweetId: string): Promise<Tweet | null> {
    try {
      const { data } = await this.client.get(`/tweets/${tweetId}`, {
        params: {
          expansions: 'author_id',
          'tweet.fields': 'created_at,referenced_tweets',
          'user.fields': 'username',
        },
      });

      const tweet = data.data;
      const author = data.includes?.users?.[0];
      const ref = tweet.referenced_tweets?.[0];

      return {
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        authorUsername: author?.username ?? 'unknown',
        createdAt: tweet.created_at,
        isReply: ref?.type === 'replied_to',
        isRetweet: ref?.type === 'retweeted',
        referencedTweetId: ref?.id,
      };
    } catch (err) {
      logger.error('[twitter] getTweet failed', { tweetId, err });
      return null;
    }
  }

  async getTweetEngagement(tweetId: string): Promise<TweetEngagement | null> {
    try {
      const { data } = await this.client.get(`/tweets/${tweetId}`, {
        params: { 'tweet.fields': 'public_metrics' },
      });

      const metrics = data.data.public_metrics;
      return {
        likeCount: metrics.like_count ?? 0,
        retweetCount: metrics.retweet_count ?? 0,
        replyCount: metrics.reply_count ?? 0,
      };
    } catch (err) {
      logger.error('[twitter] getTweetEngagement failed', { tweetId, err });
      return null;
    }
  }

  /**
   * Fetches latest tweets from a user (no replies, no retweets).
   * Returns tweets newer than sinceId.
   */
  async getLatestTweets(username: string, sinceId?: string): Promise<Tweet[]> {
    try {
      const user = await this.getUserByUsername(username);
      if (!user) return [];

      const params: Record<string, string> = {
        max_results: '10',
        expansions: 'author_id',
        'tweet.fields': 'created_at,referenced_tweets',
        'user.fields': 'username',
        exclude: 'replies,retweets',
      };

      if (sinceId) params.since_id = sinceId;

      const { data } = await this.client.get(`/users/${user.id}/tweets`, { params });

      if (!data.data) return [];

      return data.data.map((tweet: Record<string, unknown>) => ({
        id: tweet.id as string,
        text: tweet.text as string,
        authorId: user.id,
        authorUsername: username,
        createdAt: tweet.created_at as string,
        isReply: false,
        isRetweet: false,
      }));
    } catch (err) {
      logger.error('[twitter] getLatestTweets failed', { username, err });
      return [];
    }
  }

  async getUserByUsername(username: string): Promise<{ id: string; username: string } | null> {
    try {
      const { data } = await this.client.get(`/users/by/username/${username}`);
      return { id: data.data.id, username: data.data.username };
    } catch (err) {
      logger.error('[twitter] getUserByUsername failed', { username, err });
      return null;
    }
  }
}

export const twitterService = new TwitterService();
