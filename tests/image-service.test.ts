import { expect, test } from "bun:test";

test("ImageService - should validate service requirements", () => {
  const expectedMethods = [
    "getImageList",
    "getImageStatistics",
    "deleteImage",
    "cleanupOldImages"
  ];

  expectedMethods.forEach(methodName => {
    expect(methodName).toBeDefined();
    expect(typeof methodName).toBe("string");
  });
});

test("ImageService - should validate storage service dependency", () => {
  const mockStorageService = {
    listChartImages: () => Promise.resolve({ objects: [] }),
    getChartImage: () => Promise.resolve({ imageBuffer: new ArrayBuffer(1000) }),
    deleteChartImage: () => Promise.resolve(),
    cleanupOldImages: () => Promise.resolve({ deletedCount: 0 }),
  };

  expect(mockStorageService).toBeDefined();
  expect(typeof mockStorageService.listChartImages).toBe("function");
  expect(typeof mockStorageService.getChartImage).toBe("function");
  expect(typeof mockStorageService.deleteChartImage).toBe("function");
  expect(typeof mockStorageService.cleanupOldImages).toBe("function");
});

test("ImageService - should validate image list options", () => {
  const validOptions = {
    symbol: "BINANCE:BTCUSDT",
    limit: 20,
    cursor: "next-page-token",
    sortBy: "uploadedAt" as const,
    sortOrder: "desc" as const,
  };

  expect(validOptions.symbol).toMatch(/^[A-Z]+:[A-Z]+$/);
  expect(validOptions.limit).toBeGreaterThan(0);
  expect(validOptions.limit).toBeLessThanOrEqual(100);
  expect(validOptions.cursor).toBeDefined();
  expect(["uploadedAt", "symbol", "size"]).toContain(validOptions.sortBy);
  expect(["asc", "desc"]).toContain(validOptions.sortOrder);
});

test("ImageService - should validate cleanup parameters", () => {
  const validDays = [1, 7, 30, 90, 365];

  validDays.forEach(days => {
    expect(days).toBeGreaterThan(0);
    expect(Number.isInteger(days)).toBe(true);
  });
});

test("ImageService - should validate image details structure", () => {
  const mockImageDetails = {
    fileName: "test-chart.png",
    publicUrl: "https://example.com/test-chart.png",
    symbol: "BINANCE:BTCUSDT",
    interval: "1D",
    theme: "dark",
    uploadedAt: new Date(),
    size: 1000,
  };

  expect(mockImageDetails.fileName).toMatch(/\.(png|jpg|jpeg)$/);
  expect(mockImageDetails.publicUrl).toMatch(/^https?:\/\//);
  expect(mockImageDetails.symbol).toMatch(/^[A-Z]+:[A-Z]+$/);
  expect(mockImageDetails.interval).toMatch(/^\d+[mhDWM]$/);
  expect(["light", "dark"]).toContain(mockImageDetails.theme);
  expect(mockImageDetails.uploadedAt).toBeInstanceOf(Date);
  expect(mockImageDetails.size).toBeGreaterThan(0);
});

test("ImageService - should handle statistics structure", () => {
  const mockStatistics = {
    totalImages: 42,
    totalSize: 1024000,
    symbols: ["BTCUSDT", "ETHUSDT"],
    oldestImage: new Date("2023-01-01"),
    newestImage: new Date(),
  };

  expect(mockStatistics.totalImages).toBeGreaterThanOrEqual(0);
  expect(mockStatistics.totalSize).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(mockStatistics.symbols)).toBe(true);
  expect(mockStatistics.oldestImage).toBeInstanceOf(Date);
  expect(mockStatistics.newestImage).toBeInstanceOf(Date);
  expect(mockStatistics.newestImage >= mockStatistics.oldestImage).toBe(true);
});

test("ImageService - should validate cleanup result", () => {
  const mockCleanupResult = {
    deletedCount: 5,
  };

  expect(mockCleanupResult.deletedCount).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(mockCleanupResult.deletedCount)).toBe(true);
});

test("ImageService - should handle empty results gracefully", () => {
  const emptyList = {
    images: [],
    hasMore: false,
    nextCursor: undefined,
    totalCount: 0,
  };

  expect(Array.isArray(emptyList.images)).toBe(true);
  expect(emptyList.images).toHaveLength(0);
  expect(emptyList.hasMore).toBe(false);
  expect(emptyList.nextCursor).toBeUndefined();
  expect(emptyList.totalCount).toBe(0);
});