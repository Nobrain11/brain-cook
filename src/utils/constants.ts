// src/utils/constants.ts

export const CHAINS = ['solana', 'eth', 'bsc', 'base'] as const;

export const CHAIN_LABELS: Record<string, string> = {
  solana: '◎ Solana',
  eth: 'Ξ Ethereum',
  bsc: '⬡ BSC',
  base: '🔵 Base',
};

export const CHAIN_EXPLORERS: Record<string, string> = {
  solana: 'https://solscan.io/tx',
  eth: 'https://etherscan.io/tx',
  bsc: 'https://bscscan.com/tx',
  base: 'https://basescan.org/tx',
};

export const BUY_EMOJI_TIERS: { minUsd: number; emoji: string }[] = [
  { minUsd: 10_000, emoji: '🐳' },
  { minUsd: 5_000,  emoji: '🦈' },
  { minUsd: 1_000,  emoji: '🐬' },
  { minUsd: 500,    emoji: '🐟' },
  { minUsd: 0,      emoji: '🐡' },
];

export const REDIS_PREFIXES = {
  raidCooldown: 'raid:cd:',
  raidActive: 'raid:active:',
  mentionCooldown: 'mention:cd:',
  mentionDaily: 'mention:daily:',
  spamTrack: 'spam:track:',
  captcha: 'captcha:',
  volSnapshot: 'vol:snapshot:',
  xfeedLastId: 'xfeed:lastid:',
} as const;

export const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss UTC';
