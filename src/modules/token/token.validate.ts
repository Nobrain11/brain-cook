// src/modules/token/token.validate.ts
// Solana-only validation

import { isValidSolanaAddress, isValidUrl } from '../../utils/validator';

export interface TokenInput {
  address: string;
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
  } else if (!isValidSolanaAddress(input.address)) {
    errors.push('Invalid Solana token address.');
  }

  if (!input.symbol || input.symbol.length < 1) errors.push('Token symbol is required.');
  if (!input.name || input.name.length < 1) errors.push('Token name is required.');

  if (input.symbol && input.symbol.length > 12) {
    errors.push('Symbol must be 12 characters or fewer.');
  }

  if (input.website && !isValidUrl(input.website)) {
    errors.push('Website must be a valid URL.');
  }

  return { valid: errors.length === 0, errors };
}
