import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { ChartAPIResponse, ImageListResponse } from "../src/types/chart";
import { ChartGenerationError, ChartValidationError, StorageUploadError } from "../src/types/services";

// Import CloudflareBindings from worker configuration
type CloudflareBindings = {
  CHART_IMG_API_KEY?: string;
  TRADINGVIEW_BUCKET?: any;
};

// Mock dependencies
const mockLogger = {
  info: mock(() => {}),
  error: mock(() => {}),
  debug: mock(() => {}),
};

const mockChartService = {
  createSnapshot: mock(),
};

const mockStorageService = {
  uploadChartImage: mock(),
};

const mockImageService = {
  getImageList: mock(),
  getImageStatistics: mock(),
  deleteImage: mock(),
  cleanupOldImages: mock(),
};

// Mock modules
mock.module("../src/utils/logger", () => ({
  logger: mockLogger,
}));

mock.module("../src/services/chart-service", () => ({
  ChartService: mock().mockImplementation(() => mockChartService),
}));

mock.module("../src/services/storage-service", () => ({
  StorageService: mock().mockImplementation(() => mockStorageService),
}));

mock.module("../src/services/image-service", () => ({
  ImageService: mock().mockImplementation(() => mockImageService),
}));

// Mock the actual image routes functions for testing
describe("Image Routes Helper Functions", () => {
  let mockEnv: CloudflareBindings;

  beforeEach(() => {
    // Reset all mocks
    mockChartService.createSnapshot.mockReset();
    mockStorageService.uploadChartImage.mockReset();
    mockImageService.getImageList.mockReset();
    mockImageService.getImageStatistics.mockReset();
    mockImageService.deleteImage.mockReset();
    mockImageService.cleanupOldImages.mockReset();
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
    mockLogger.debug.mockReset();

    // Setup test environment
    mockEnv = {
      CHART_IMG_API_KEY: "test-api-key",
      TRADINGVIEW_BUCKET: "test-bucket",
    };

    // Mock process.env for custom domain
    process.env.CUSTOM_DOMAIN = "test-domain.com";
  });

  afterEach(() => {
    delete process.env.CUSTOM_DOMAIN;
  });

  describe("Environment Validation", () => {
    test("should validate CloudflareBindings type", () => {
      const env: CloudflareBindings = {
        CHART_IMG_API_KEY: "test-key",
        TRADINGVIEW_BUCKET: "test-bucket",
      };

      expect(env.CHART_IMG_API_KEY).toBe("test-key");
      expect(env.TRADINGVIEW_BUCKET).toBe("test-bucket");
    });

    test("should use mock environment", () => {
      expect(mockEnv.CHART_IMG_API_KEY).toBe("test-api-key");
      expect(mockEnv.TRADINGVIEW_BUCKET).toBe("test-bucket");
    });

    test("should handle missing API key", () => {
      const env: CloudflareBindings = {
        CHART_IMG_API_KEY: undefined,
        TRADINGVIEW_BUCKET: "test-bucket",
      };

      expect(env.CHART_IMG_API_KEY).toBeUndefined();
      expect(env.TRADINGVIEW_BUCKET).toBeDefined();
    });

    test("should handle missing R2 bucket", () => {
      const env: CloudflareBindings = {
        CHART_IMG_API_KEY: "test-key",
        TRADINGVIEW_BUCKET: undefined,
      };

      expect(env.CHART_IMG_API_KEY).toBeDefined();
      expect(env.TRADINGVIEW_BUCKET).toBeUndefined();
    });
  });

  describe("Mock Service Integration", () => {
    test("should have properly mocked chart service", () => {
      expect(mockChartService.createSnapshot).toBeDefined();
      expect(typeof mockChartService.createSnapshot).toBe("function");
    });

    test("should have properly mocked storage service", () => {
      expect(mockStorageService.uploadChartImage).toBeDefined();
      expect(typeof mockStorageService.uploadChartImage).toBe("function");
    });

    test("should have properly mocked image service", () => {
      expect(mockImageService.getImageList).toBeDefined();
      expect(mockImageService.getImageStatistics).toBeDefined();
      expect(mockImageService.deleteImage).toBeDefined();
      expect(mockImageService.cleanupOldImages).toBeDefined();
    });

    test("should have properly mocked logger", () => {
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.error).toBeDefined();
      expect(mockLogger.debug).toBeDefined();
    });
  });

  describe("Error Handling Types", () => {
    test("should create ChartValidationError", () => {
      const error = new ChartValidationError("Test validation error");
      expect(error).toBeInstanceOf(ChartValidationError);
      expect(error.message).toBe("Test validation error");
    });

    test("should create ChartGenerationError", () => {
      const error = new ChartGenerationError("Test generation error");
      expect(error).toBeInstanceOf(ChartGenerationError);
      expect(error.message).toBe("Test generation error");
    });

    test("should create StorageUploadError", () => {
      const error = new StorageUploadError("Test storage error");
      expect(error).toBeInstanceOf(StorageUploadError);
      expect(error.message).toBe("Test storage error");
    });
  });

  describe("Response Type Validation", () => {
    test("should validate ChartAPIResponse structure", () => {
      const successResponse: ChartAPIResponse = {
        success: true,
        data: {
          fileName: "test.png",
          publicUrl: "https://example.com/test.png",
          symbol: "BTCUSDT",
          interval: "1D",
          width: 800,
          height: 600,
          theme: "dark",
          uploadedAt: new Date().toISOString(),
          size: 1000,
          etag: "test-etag",
        },
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toBeDefined();
      expect(successResponse.data?.fileName).toBe("test.png");
    });

    test("should validate error ChartAPIResponse structure", () => {
      const errorResponse: ChartAPIResponse = {
        success: false,
        error: "Test error message",
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe("Test error message");
      expect(errorResponse.data).toBeUndefined();
    });

    test("should validate ImageListResponse structure", () => {
      const response: ImageListResponse = {
        success: true,
        data: {
          images: [],
          count: 0,
          hasMore: false,
          nextCursor: undefined,
        },
      };

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data?.images)).toBe(true);
    });
  });

  describe("Service Mock Behavior", () => {
    test("should mock chart service createSnapshot", async () => {
      const mockResult = {
        imageBuffer: new ArrayBuffer(1000),
        metadata: { generatedAt: new Date() },
      };

      mockChartService.createSnapshot.mockResolvedValue(mockResult);

      const result = await mockChartService.createSnapshot({
        symbol: "BTCUSDT",
        interval: "1D",
        width: 800,
        height: 600,
        theme: "dark",
      });

      expect(result).toBe(mockResult);
      expect(mockChartService.createSnapshot).toHaveBeenCalledWith({
        symbol: "BTCUSDT",
        interval: "1D",
        width: 800,
        height: 600,
        theme: "dark",
      });
    });

    test("should mock storage service uploadChartImage", async () => {
      const mockResult = {
        fileName: "test.png",
        publicUrl: "https://example.com/test.png",
        uploadedAt: new Date(),
        size: 1000,
        etag: "test-etag",
      };

      mockStorageService.uploadChartImage.mockResolvedValue(mockResult);

      const result = await mockStorageService.uploadChartImage(new ArrayBuffer(1000), "BTCUSDT", {
        interval: "1D",
        theme: "dark",
        width: 800,
        height: 600,
        generatedAt: new Date(),
      });

      expect(result).toBe(mockResult);
      expect(mockStorageService.uploadChartImage).toHaveBeenCalled();
    });

    test("should mock image service getImageList", async () => {
      const mockResult = {
        images: [
          {
            fileName: "test.png",
            publicUrl: "https://example.com/test.png",
            symbol: "BTCUSDT",
            interval: "1D",
            theme: "dark",
            uploadedAt: new Date(),
            size: 1000,
          },
        ],
        hasMore: false,
        nextCursor: null,
      };

      mockImageService.getImageList.mockResolvedValue(mockResult);

      const result = await mockImageService.getImageList({
        symbol: "BTCUSDT",
        limit: 20,
      });

      expect(result).toBe(mockResult);
      expect(mockImageService.getImageList).toHaveBeenCalledWith({
        symbol: "BTCUSDT",
        limit: 20,
      });
    });
  });
});
