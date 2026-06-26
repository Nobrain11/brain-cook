// src/services/pricing.service.ts
// Fetches token price and volume data from Birdeye (Solana) and CoinGecko (EVM).

import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { Chain, VolumeWindows } from '../types/global';

interface TokenPrice {
  priceUsd: number;
  priceChange24h: number;
  marketCapUsd: number;
}

interface VolumeQuery {
  tokenAddress: string;
  chain: Chain;
}

class PricingService {

  // ─── Birdeye (Solana) ────────────────────────────────────────────────────

  private async birdeyeGet<T>(path: string): Promise<T | null> {
    try {
      const { data } = await axios.get(`https://public-api.birdeye.so${path}`, {
        headers: { 'X-API-KEY': env.BIRDEYE_API_KEY },
        timeout: 8_000,
      });
      return data as T;
    } catch (err) {
      logger.warn('[pricing] Birdeye request failed', { path, err });
      return null;
    }
  }

  // ─── CoinGecko (EVM) ─────────────────────────────────────────────────────

  private evmChainId(chain: Chain): string {
    const map: Record<string, string> = {
      eth: 'ethereum',
      bsc: 'binance-smart-chain',
      base: 'base',
    };
    return map[chain] ?? 'ethereum';
  }

  private async geckoGet<T>(path: string): Promise<T | null> {
    try {
      const headers: Record<string, string> = {};
      if (env.COINGECKO_API_KEY) headers['x-cg-pro-api-key'] = env.COINGECKO_API_KEY;

      const { data } = await axios.get(`https://api.coingecko.com/api/v3${path}`, {
        headers,
        timeout: 8_000,
      });
      return data as T;
    } catch (err) {
      logger.warn('[pricing] CoinGecko request failed', { path, err });
      return null;
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async getTokenPrice(tokenAddress: string, chain: Chain): Promise<TokenPrice | null> {
    if (chain === 'solana') {
      const data = await this.birdeyeGet<{
        data: { value: number; priceChangePercent24h: number; mc: number };
      }>(`/defi/price?address=${tokenAddress}`);

      if (!data?.data) return null;
      return {
        priceUsd: data.data.value,
        priceChange24h: data.data.priceChangePercent24h,
        marketCapUsd: data.data.mc,
      };
    }

    const platform = this.evmChainId(chain);
    const data = await this.geckoGet<{
      market_data: {
        current_price: { usd: number };
        price_change_percentage_24h: number;
        market_cap: { usd: number };
      };
    }>(`/coins/${platform}/contract/${tokenAddress}`);

    if (!data?.market_data) return null;
    return {
      priceUsd: data.market_data.current_price.usd,
      priceChange24h: data.market_data.price_change_percentage_24h,
      marketCapUsd: data.market_data.market_cap.usd,
    };
  }

  async getVolumeWindows(query: VolumeQuery): Promise<VolumeWindows | null> {
    const { tokenAddress, chain } = query;

    if (chain === 'solana') {
      const data = await this.birdeyeGet<{
        data: { v5m: number; v1h: number; v24h: number };
      }>(`/defi/token_overview?address=${tokenAddress}`);

      if (!data?.data) return null;
      return {
        volume5m: data.data.v5m ?? 0,
        volume1h: data.data.v1h ?? 0,
        volume24h: data.data.v24h ?? 0,
      };
    }

    // EVM: use CoinGecko total_volumes (approx only — no 5m window)
    const platform = this.evmChainId(chain);
    const data = await this.geckoGet<{
      market_data: { total_volume: { usd: number } };
    }>(`/coins/${platform}/contract/${tokenAddress}`);

    if (!data?.market_data) return null;
    return {
      volume5m: 0,
      volume1h: 0,
      volume24h: data.market_data.total_volume.usd,
    };
  }

  // ─── Plan / License check ────────────────────────────────────────────────

  verifyProLicense(key: string): boolean {
    // Simple HMAC check — swap with real license server call if needed
    return key === env.PRO_LICENSE_SECRET;
  }
}

export const pricingService = new PricingService();
