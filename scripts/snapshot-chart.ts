#!/usr/bin/env bun

export {}; // Make this file a module

// Standard TradingView symbols that are supported by Chart-IMG API
const TEST_SYMBOLS = [
  "BINANCE:BTCUSDT",
  "BINANCE:ETHUSDT",
  "BINANCE:SOLUSDT",
  "COINBASE:BTCUSD",
  "KRAKEN:XBTUSD"
] as const;

const DEFAULT_CONFIG = {
  width: 800,
  height: 600,
  interval: "1D", // Use supported interval
  theme: "dark"
} as const;

interface TestConfig {
  symbol: string;
  interval?: string;
  width?: number;
  height?: number;
  theme?: "light" | "dark";
}

/**
 * Generate chart snapshot and save to local file using Bun APIs
 */
async function generateChartSnapshot(config: TestConfig): Promise<void> {
  const apiKey = process.env.CHART_IMG_API_KEY;

  if (!apiKey) {
    throw new Error("CHART_IMG_API_KEY environment variable is required");
  }

  // Use ChartImageClient directly to bypass Solana DEX validation
  const { ChartImageClient } = await import("../src/libs/chart-img");
  const client = new ChartImageClient(apiKey);

  const request = {
    symbol: config.symbol,
    interval: config.interval ?? DEFAULT_CONFIG.interval,
    width: config.width ?? DEFAULT_CONFIG.width,
    height: config.height ?? DEFAULT_CONFIG.height,
    theme: config.theme ?? DEFAULT_CONFIG.theme,
  };

  console.log("🔄 Generating chart snapshot...");
  console.log(`   Symbol: ${request.symbol}`);
  console.log(`   Interval: ${request.interval}`);
  console.log(`   Size: ${request.width}x${request.height}`);
  console.log(`   Theme: ${request.theme}`);

  try {
    const result = await client.generateChartImage(request, {
      timeout: 30000,
      format: "png",
      locale: "en",
    });

    // Create output directory path using Bun's path utilities
    const outputDir = `${import.meta.dir}/../output/charts`;

    // Ensure output directory exists using Bun.write
    const dirFile = Bun.file(`${outputDir}/.gitkeep`);
    await Bun.write(dirFile, "");

    // Generate filename from symbol and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const symbolSafe = config.symbol.replace(/[/:]/g, "_");
    const filename = `${symbolSafe}_${config.interval ?? DEFAULT_CONFIG.interval}_${timestamp}.png`;
    const filepath = `${outputDir}/${filename}`;

    // Save image buffer to file using Bun.write
    const imageFile = Bun.file(filepath);
    await Bun.write(imageFile, result.imageBuffer);

    console.log(`✅ Chart snapshot saved: ${filepath}`);
    console.log(`   File size: ${(result.size / 1024).toFixed(2)} KB`);
    console.log(`   Content type: ${result.contentType}`);
    console.log("");

  } catch (error) {
    console.error(`❌ Failed to generate chart for ${config.symbol}:`, error);
    throw error;
  }
}

/**
 * Generate multiple chart snapshots for testing
 */
async function generateTestSnapshots(): Promise<void> {
  console.log("🚀 Starting TradingView chart snapshot test with Bun...\n");

  const testConfigs: TestConfig[] = [
    // Basic TradingView symbols with supported intervals
    { symbol: "BINANCE:BTCUSDT", interval: "1D" },
    { symbol: "BINANCE:ETHUSDT", interval: "1W" },
    { symbol: "BINANCE:SOLUSDT", interval: "1M" },

    // Test different themes
    { symbol: "BINANCE:BTCUSDT", theme: "light" as const, interval: "1D" },

    // Test different sizes (within API resolution limits)
    {
      symbol: "COINBASE:BTCUSD",
      width: 800, // Changed from 1200 to stay within limits
      height: 600, // Changed from 800 to stay within limits
      theme: "light" as const,
      interval: "1W"
    },
  ];

  let successCount = 0;
  let failCount = 0;

  // Process one by one to see progress
  for (const config of testConfigs) {
    try {
      await generateChartSnapshot(config);
      successCount++;
    } catch {
      failCount++;
      console.error(`Failed: ${config.symbol}\n`);
    }
  }

  console.log("📊 Test Summary:");
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Output directory: ${import.meta.dir}/../output/charts`);
  console.log(`   🚀 Runtime: Bun ${Bun.version}`);
  console.log("");
  console.log("🎯 Supported intervals: 1D, 1W, 1M");
  console.log("📏 Max resolution: 800x600 (API limit)");
}

/**
 * Generate a single custom chart snapshot
 */
async function generateCustomSnapshot(): Promise<void> {
  // Parse command line arguments for custom configuration
  const args = Bun.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage for custom chart:");
    console.log("  bun run scripts/snapshot-chart.ts <symbol> [interval] [width] [height] [theme]");
    console.log("");
    console.log("Examples:");
    console.log("  bun run scripts/snapshot-chart.ts BINANCE:BTCUSDT");
    console.log("  bun run scripts/snapshot-chart.ts BINANCE:ETHUSDT 1W");
    console.log("  bun run scripts/snapshot-chart.ts COINBASE:BTCUSD 1D 800 600 light");
    console.log("");
    console.log("Supported TradingView symbols:");
    TEST_SYMBOLS.forEach(symbol => console.log(`  - ${symbol}`));
    console.log("");
    console.log("Supported intervals: 1D, 1W, 1M");
    console.log("Max resolution: 800x600 (API limit)");
    console.log("");
    return;
  }

  const config: TestConfig = {
    symbol: args[0],
    interval: args[1] || "1D", // Default to supported interval
    width: args[2] ? parseInt(args[2]) : undefined,
    height: args[3] ? parseInt(args[3]) : undefined,
    theme: args[4] as "light" | "dark" | undefined,
  };

  await generateChartSnapshot(config);
}

/**
 * Main execution optimized for Bun
 */
async function main(): Promise<void> {
  try {
    console.log(`🚀 Running with Bun ${Bun.version}`);
    console.log(`📂 Working directory: ${import.meta.dir}`);
    console.log("");

    const args = Bun.argv.slice(2);

    if (args.length > 0) {
      // Custom single snapshot
      await generateCustomSnapshot();
    } else {
      // Generate test snapshots
      await generateTestSnapshots();
    }

  } catch (error) {
    console.error("💥 Script execution failed:", error);
    process.exit(1);
  }
}

// Execute main function
await main();
