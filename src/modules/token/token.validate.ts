// src/modules/token/token.validate.ts

import { isValidTokenAddress, isValidUrl } from '../../utils/validator';
import type { Chain } from '../../types/global';

export interface TokenInput {
  address: string;
  chain: Chain;
  symbol: string;
  name: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTokenInput(input: Partial<TokenInput>): ValidationResult {
  const errors: string[] = [];

  if (!input.address) {
    errors.push('Token address is required.');
  } else if (input.chain && !isValidTokenAddress(input.address, input.chain)) {
    errors.push(`Invalid token address for chain: ${input.chain}.`);
  }

  if (!input.chain) errors.push('Chain is required (solana, eth, bsc, base).');
  if (!input.symbol || input.symbol.length < 1) errors.push('Token symbol is required.');
  if (!input.name || input.name.length < 1) errors.push('Token name is required.');

  if (input.website && !isValidUrl(input.website)) {
    errors.push('Website must be a valid URL.');
  }

  if (input.symbol && input.symbol.length > 12) {
    errors.push('Symbol must be 12 characters or fewer.');
  }

  return { valid: errors.length === 0, errors };
}
