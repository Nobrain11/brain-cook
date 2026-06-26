// src/services/blockchain.service.ts
// WebSocket-based on-chain buy event listener for multi-chain support.

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { BuyEvent, Chain } from '../types/global';

type BuyEventListener = (event: BuyEvent) => void;

interface ChainConfig {
  wsUrl: string;
  chain: Chain;
}

const CHAIN_CONFIGS: ChainConfig[] = [
  { wsUrl: env.SOLANA_WS_URL, chain: 'solana' },
  { wsUrl: env.ETH_WS_URL, chain: 'eth' },
  { wsUrl: env.BSC_WS_URL, chain: 'bsc' },
  { wsUrl: env.BASE_WS_URL, chain: 'base' },
];

class BlockchainService extends EventEmitter {
  private sockets = new Map<Chain, WebSocket>();
  private reconnectTimers = new Map<Chain, NodeJS.Timeout>();
  private watchedTokens = new Map<Chain, Set<string>>();

  // Register a token address to watch on a given chain
  watchToken(chain: Chain, tokenAddress: string): void {
    if (!this.watchedTokens.has(chain)) {
      this.watchedTokens.set(chain, new Set());
    }
    this.watchedTokens.get(chain)!.add(tokenAddress.toLowerCase());
    logger.info('[blockchain] Watching token', { chain, tokenAddress });
  }

  unwatchToken(chain: Chain, tokenAddress: string): void {
    this.watchedTokens.get(chain)?.delete(tokenAddress.toLowerCase());
  }

  onBuy(listener: BuyEventListener): void {
    this.on('buy', listener);
  }

  offBuy(listener: BuyEventListener): void {
    this.off('buy', listener);
  }

  connectAll(): void {
    for (const config of CHAIN_CONFIGS) {
      this.connect(config);
    }
  }

  private connect(config: ChainConfig): void {
    const { wsUrl, chain } = config;

    try {
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        logger.info('[blockchain] WS connected', { chain });
        this.sockets.set(chain, ws);
        this.subscribe(ws, chain);
      });

      ws.on('message', (raw: Buffer) => {
        this.handleMessage(chain, raw);
      });

      ws.on('error', (err) => {
        logger.warn('[blockchain] WS error', { chain, err });
      });

      ws.on('close', () => {
        logger.warn('[blockchain] WS closed, scheduling reconnect', { chain });
        this.sockets.delete(chain);
        this.scheduleReconnect(config);
      });
    } catch (err) {
      logger.error('[blockchain] Failed to create WS', { chain, err });
      this.scheduleReconnect(config);
    }
  }

  private subscribe(ws: WebSocket, chain: Chain): void {
    // Chain-specific subscription messages
    if (chain === 'solana') {
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'logsSubscribe',
        params: [{ mentions: [] }, { commitment: 'confirmed' }],
      }));
    } else {
      // EVM: subscribe to pending transactions
      ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_subscribe',
        params: ['logs', {}],
      }));
    }
  }

  private handleMessage(chain: Chain, raw: Buffer): void {
    try {
      const msg = JSON.parse(raw.toString());
      const parsed = this.parseRawEvent(chain, msg);
      if (!parsed) return;

      const watched = this.watchedTokens.get(chain);
      if (!watched || !watched.has(parsed.tokenAddress.toLowerCase())) return;

      this.emit('buy', parsed);
    } catch {
      // Malformed message — ignore silently
    }
  }

  private parseRawEvent(chain: Chain, msg: Record<string, unknown>): BuyEvent | null {
    // Real implementation would decode swap logs / tx data per DEX.
    // This is the integration surface — fill with actual ABI parsing.
    if (chain === 'solana') {
      return this.parseSolanaLog(msg);
    }
    return this.parseEvmLog(chain, msg);
  }

  private parseSolanaLog(_msg: Record<string, unknown>): BuyEvent | null {
    // TODO: Parse Raydium / Jupiter swap logs
    return null;
  }

  private parseEvmLog(_chain: Chain, _msg: Record<string, unknown>): BuyEvent | null {
    // TODO: Parse Uniswap / PancakeSwap swap events
    return null;
  }

  private scheduleReconnect(config: ChainConfig, delayMs = 5000): void {
    const existing = this.reconnectTimers.get(config.chain);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      logger.info('[blockchain] Reconnecting', { chain: config.chain });
      this.connect(config);
    }, delayMs);

    this.reconnectTimers.set(config.chain, timer);
  }

  disconnectAll(): void {
    for (const [chain, ws] of this.sockets) {
      ws.close();
      logger.info('[blockchain] WS disconnected', { chain });
    }
    this.sockets.clear();

    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();
  }
}

export const blockchainService = new BlockchainService();
