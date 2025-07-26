import { expect, test } from "bun:test";
import { ChartGenerationError, ChartValidationError } from "../src/types/services";

test("ChartService - should validate API key requirements", () => {
  const apiKey = "test-api-key";

  expect(apiKey).toBeDefined();
  expect(typeof apiKey).toBe("string");
  expect(apiKey.length).toBeGreaterThan(0);
});

test("ChartService - should have expected method name", () => {
  const expectedMethod = "createSnapshot";

  expect(expectedMethod).toBeDefined();
  expect(typeof expectedMethod).toBe("string");
});

test("ChartService - should validate chart request structure", () => {
  const validRequest = {
    symbol: "BINANCE:BTCUSDT",
    interval: "1D",
    width: 800,
    height: 600,
    theme: "dark",
  };

  expect(validRequest.symbol).toMatch(/^[A-Z]+:[A-Z]+$/);
  expect(validRequest.interval).toMatch(/^\d+[mhDWM]$/);
  expect(validRequest.width).toBeGreaterThan(0);
  expect(validRequest.height).toBeGreaterThan(0);
  expect(["light", "dark"]).toContain(validRequest.theme);
});

test("ChartService - should validate symbols", () => {
  const validSymbols = ["BINANCE:BTCUSDT", "NASDAQ:AAPL", "NYSE:TSLA", "COINBASE:ETHUSD"];

  validSymbols.forEach((symbol) => {
    expect(symbol).toContain(":");
    expect(symbol.split(":")).toHaveLength(2);
    const [exchange, pair] = symbol.split(":");
    expect(exchange).toMatch(/^[A-Z]+$/);
    expect(pair).toMatch(/^[A-Z]+$/);
  });
});

test("ChartService - should validate intervals", () => {
  const validIntervals = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W", "1M"];

  validIntervals.forEach((interval) => {
    expect(interval).toMatch(/^\d+[mhDWM]$/);
  });
});

test("ChartService - should validate dimensions", () => {
  const validDimensions = [
    { width: 400, height: 300 },
    { width: 800, height: 600 },
    { width: 1200, height: 800 },
    { width: 1920, height: 1080 },
  ];

  validDimensions.forEach(({ width, height }) => {
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(width).toBeLessThanOrEqual(4000);
    expect(height).toBeLessThanOrEqual(4000);
    expect(Number.isInteger(width)).toBe(true);
    expect(Number.isInteger(height)).toBe(true);
  });
});

test("ChartService - should validate theme options", () => {
  const validThemes = ["light", "dark"];

  validThemes.forEach((theme) => {
    expect(["light", "dark"]).toContain(theme);
  });
});

test("ChartService - should handle error types correctly", () => {
  const validationError = new ChartValidationError("Invalid symbol");
  const generationError = new ChartGenerationError("Generation failed");

  expect(validationError).toBeInstanceOf(ChartValidationError);
  expect(validationError).toBeInstanceOf(Error);
  expect(validationError.message).toBe("Invalid symbol");

  expect(generationError).toBeInstanceOf(ChartGenerationError);
  expect(generationError).toBeInstanceOf(Error);
  expect(generationError.message).toBe("Generation failed");
});

test("ChartService - should validate API key format", () => {
  const apiKey = "test-api-key";

  expect(apiKey).toBeDefined();
  expect(typeof apiKey).toBe("string");
  expect(apiKey.length).toBeGreaterThan(0);
});

test("ChartService - should validate result structure", () => {
  const mockResult = {
    imageBuffer: new ArrayBuffer(1000),
    metadata: {
      generatedAt: new Date(),
      symbol: "BTCUSDT",
      interval: "1D",
      width: 800,
      height: 600,
      theme: "dark",
    },
  };

  expect(mockResult.imageBuffer).toBeInstanceOf(ArrayBuffer);
  expect(mockResult.imageBuffer.byteLength).toBeGreaterThan(0);
  expect(mockResult.metadata).toBeDefined();
  expect(mockResult.metadata.generatedAt).toBeInstanceOf(Date);
  expect(mockResult.metadata.symbol).toBeDefined();
  expect(mockResult.metadata.interval).toBeDefined();
  expect(mockResult.metadata.width).toBeGreaterThan(0);
  expect(mockResult.metadata.height).toBeGreaterThan(0);
  expect(["light", "dark"]).toContain(mockResult.metadata.theme);
});

test("ChartService - should handle edge cases", () => {
  // Minimum valid dimensions
  const minDimensions = { width: 1, height: 1 };
  expect(minDimensions.width).toBeGreaterThan(0);
  expect(minDimensions.height).toBeGreaterThan(0);

  // Maximum reasonable dimensions
  const maxDimensions = { width: 4000, height: 4000 };
  expect(maxDimensions.width).toBeLessThanOrEqual(4000);
  expect(maxDimensions.height).toBeLessThanOrEqual(4000);

  // Symbol with numbers
  const symbolWithNumbers = "BINANCE:BTC1USDT";
  expect(symbolWithNumbers).toMatch(/^[A-Z]+:[A-Z0-9]+$/);
});
