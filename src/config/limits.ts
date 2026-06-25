// src/config/limits.ts
// Centralised cooldown and cap constants.

export const LIMITS = {
  raid: {
    cooldownMs: 60 * 60 * 1000,        // 1 hour per user per raid
    maxActiveRaids: 1,                   // 1 active raid per group at a time
    verifyWindowMs: 30 * 60 * 1000,     // 30 min to verify after tweet posted
  },

  mention: {
    dailyCapPerUser: 5,                  // max /mention calls per user per day
    cooldownMs: 10 * 60 * 1000,         // 10 min between /mention uses
    maxTagsPerMessage: 5,               // users tagged per /mention call
  },

  xfeed: {
    pollIntervalMs: 5 * 60 * 1000,     // poll X API every 5 min
    maxFeedsPerGroup: 10,              // whitelisted accounts per group
  },

  buyAlert: {
    minBuyUsd: 10,                      // default minimum buy to alert (USD)
    spotlightDelayMs: 5 * 1000,        // 5s after buy alert to post spotlight
  },

  volume: {
    cronInterval: '*/5 * * * *',        // every 5 minutes
    cacheTtlSeconds: 300,
  },

  moderation: {
    spamWindowMs: 10 * 1000,           // 10s window for spam detection
    spamMaxMessages: 5,                 // max messages in window before mute
    muteDurationSeconds: 60 * 10,      // 10 min mute
    captchaTimeoutSeconds: 60,         // 60s to solve captcha
  },

  rank: {
    xpPerMessage: 1,
    xpPerRaid: 50,
    xpPerBuy: 20,
    leaderboardSize: 10,
  },
} as const;
