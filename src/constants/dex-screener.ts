/**
 * DEX Screener configurations and chart settings
 */

export interface DexScreenerConfig {
  baseUrl: string;
  apiEndpoints: {
    tokens: string;
    pairs: string;
    search: string;
  };
  supportedChains: string[];
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export const DEX_SCREENER_CONFIG: DexScreenerConfig = {
  baseUrl: "https://api.dexscreener.com",
  apiEndpoints: {
    tokens: "/latest/dex/tokens",
    pairs: "/latest/dex/pairs",
    search: "/latest/dex/search",
  },
  supportedChains: ["solana", "ethereum", "bsc", "polygon", "arbitrum", "avalanche"],
  rateLimit: {
    requestsPerMinute: 300,
    burstLimit: 50,
  },
};

export interface ChartConfig {
  defaultTheme: "light" | "dark";
  defaultInterval: string;
  defaultSize: {
    width: number;
    height: number;
  };
  maxSize: {
    width: number;
    height: number;
  };
  supportedFormats: string[];
  timeout: {
    default: number;
    popular: number;
    minor: number;
  };
}

export const CHART_CONFIG: ChartConfig = {
  defaultTheme: "dark",
  defaultInterval: "1H",
  defaultSize: {
    width: 800,
    height: 600,
  },
  maxSize: {
    width: 1600,
    height: 1200,
  },
  supportedFormats: ["png", "jpg", "webp"],
  timeout: {
    default: 20000,
    popular: 15000,
    minor: 30000,
  },
};

export const RESTRICTED_PATTERNS = [/^TEST:/i, /^DEMO:/i, /^FAKE:/i, /SCAM/i] as const;

/**
 * Chart intervals with labels for Solana DEX
 */
export const CHART_INTERVALS = [
  { value: "1m", label: "1分", category: "minute", dexScreener: "1m" },
  { value: "5m", label: "5分", category: "minute", dexScreener: "5m" },
  { value: "15m", label: "15分", category: "minute", dexScreener: "15m" },
  { value: "30m", label: "30分", category: "minute", dexScreener: "30m" },
  { value: "1H", label: "1時間", category: "hour", dexScreener: "1h" },
  { value: "4H", label: "4時間", category: "hour", dexScreener: "4h" },
  { value: "1D", label: "1日", category: "day", dexScreener: "1d" },
  { value: "1W", label: "1週間", category: "week", dexScreener: "1w" },
] as const;

export type ChartInterval = (typeof CHART_INTERVALS)[number]["value"];

/**
 * Get timeout based on token popularity
 */
export function getTimeoutForToken(symbol: string): number {
  const popularTokens = ["SOL", "BTC", "ETH", "USDC", "USDT", "JUP", "RAY"];

  if (popularTokens.includes(symbol.toUpperCase())) {
    return CHART_CONFIG.timeout.popular;
  }

  return CHART_CONFIG.timeout.default;
}

/**
 * Check if symbol is restricted
 */
export function isRestrictedSymbol(symbol: string): boolean {
  return RESTRICTED_PATTERNS.some((pattern) => pattern.test(symbol));
}
