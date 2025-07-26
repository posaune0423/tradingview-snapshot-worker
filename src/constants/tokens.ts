/**
 * Solana token configurations and popular trading pairs
 */

export interface TokenConfig {
  symbol: string;
  name: string;
  mintAddress: string;
  decimals: number;
  coingeckoId?: string;
  popular: boolean;
}

export const SOLANA_TOKENS: Record<string, TokenConfig> = {
  SOL: {
    symbol: "SOL",
    name: "Solana",
    mintAddress: "So11111111111111111111111111111111111111112", // Wrapped SOL
    decimals: 9,
    coingeckoId: "solana",
    popular: true,
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    coingeckoId: "usd-coin",
    popular: true,
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    mintAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    coingeckoId: "tether",
    popular: true,
  },
  BTC: {
    symbol: "BTC",
    name: "Bitcoin (Portal)",
    mintAddress: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    decimals: 8,
    coingeckoId: "bitcoin",
    popular: true,
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum (Portal)",
    mintAddress: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    decimals: 8,
    coingeckoId: "ethereum",
    popular: true,
  },
  JUP: {
    symbol: "JUP",
    name: "Jupiter",
    mintAddress: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
    coingeckoId: "jupiter",
    popular: true,
  },
  RAY: {
    symbol: "RAY",
    name: "Raydium",
    mintAddress: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    decimals: 6,
    coingeckoId: "raydium",
    popular: true,
  },
  JTO: {
    symbol: "JTO",
    name: "Jito",
    mintAddress: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    decimals: 9,
    coingeckoId: "jito-governance-token",
    popular: true,
  },
  WIF: {
    symbol: "WIF",
    name: "dogwifhat",
    mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 6,
    coingeckoId: "dogwifcoin",
    popular: true,
  },
  BONK: {
    symbol: "BONK",
    name: "Bonk",
    mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    coingeckoId: "bonk",
    popular: true,
  },
} as const;

export const POPULAR_PAIRS = [
  "SOL/USDC",
  "SOL/USDT",
  "BTC/USDC",
  "ETH/USDC",
  "JUP/USDC",
  "RAY/USDC",
  "JTO/USDC",
  "WIF/USDC",
  "BONK/USDC",
] as const;

export const POPULAR_PERPETUAL_PAIRS = ["SOL-PERP", "BTC-PERP", "ETH-PERP", "JUP-PERP", "JTO-PERP"] as const;

export const POPULAR_SYMBOLS = Object.keys(SOLANA_TOKENS).filter(
  (symbol) => SOLANA_TOKENS[symbol as keyof typeof SOLANA_TOKENS]?.popular === true,
);

/**
 * Get formatted symbol for exchange
 */
export function getExchangeSymbol(baseToken: string, quoteToken: string = "USDC", exchange: string): string {
  switch (exchange.toUpperCase()) {
    case "DRIFT":
      return `${baseToken}-PERP`;
    case "RAYDIUM":
    case "JUPITER":
      return `${baseToken}/${quoteToken}`;
    default:
      return `${exchange}:${baseToken}${quoteToken}`;
  }
}
