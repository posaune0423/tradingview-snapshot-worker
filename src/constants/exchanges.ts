/**
 * Solana DEX exchanges and their configurations
 */

export interface DEXConfig {
  id: string;
  name: string;
  displayName: string;
  baseUrl?: string;
  supported: boolean;
  type: "perpetual" | "spot" | "both";
}

export const SOLANA_EXCHANGES: Record<string, DEXConfig> = {
  DRIFT: {
    id: "drift",
    name: "DRIFT",
    displayName: "Drift Protocol",
    baseUrl: "https://app.drift.trade",
    supported: true,
    type: "perpetual",
  },
  RAYDIUM: {
    id: "raydium",
    name: "RAYDIUM",
    displayName: "Raydium",
    baseUrl: "https://raydium.io",
    supported: true,
    type: "both",
  },
  JUPITER: {
    id: "jupiter",
    name: "JUPITER",
    displayName: "Jupiter",
    baseUrl: "https://jup.ag",
    supported: true,
    type: "spot",
  },
  MANGO: {
    id: "mango",
    name: "MANGO",
    displayName: "Mango Markets",
    baseUrl: "https://trade.mango.markets",
    supported: true,
    type: "both",
  },
  PHOENIX: {
    id: "phoenix",
    name: "PHOENIX",
    displayName: "Phoenix",
    baseUrl: "https://app.phoenix.trade",
    supported: true,
    type: "spot",
  },
} as const;

export const SUPPORTED_SOLANA_EXCHANGES = Object.values(SOLANA_EXCHANGES)
  .filter((exchange) => exchange.supported)
  .map((exchange) => exchange.name);

export const PERPETUAL_EXCHANGES = Object.values(SOLANA_EXCHANGES)
  .filter((exchange) => exchange.type === "perpetual" || exchange.type === "both")
  .map((exchange) => exchange.name);
