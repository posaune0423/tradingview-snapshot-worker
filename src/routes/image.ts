import type { Context } from "hono";
import { Hono } from "hono";
import { ChartService } from "../services/chart-service";
import { ImageService } from "../services/image-service";
import { StorageService } from "../services/storage-service";
import type { ChartAPIResponse, ChartSnapshotOptions, ImageListResponse } from "../types/chart";
import { ChartGenerationError, ChartValidationError, StorageUploadError } from "../types/services";
import { logger } from "../utils/logger";

const imageRoutes = new Hono<{ Bindings: CloudflareBindings }>();

// ヘルパー関数: 環境設定の検証
function validateEnvironment(c: Context<{ Bindings: CloudflareBindings }>) {
  const apiKey = c.env.CHART_IMG_API_KEY;
  const r2Bucket = c.env.TRADINGVIEW_BUCKET;
  const customDomain = process.env.CUSTOM_DOMAIN || "your-custom-domain.com";

  if (!apiKey) {
    logger.error("Chart-IMG API key not configured");
    return { error: c.json({ error: "API key not configured" }, 500) };
  }

  if (!r2Bucket) {
    logger.error("R2 bucket not configured");
    return { error: c.json({ error: "Storage not configured" }, 500) };
  }

  return { apiKey, r2Bucket, customDomain };
}

// ヘルパー関数: チャートリクエストの作成
function createChartRequest(options: ChartSnapshotOptions) {
  return {
    symbol: options.symbol || "BINANCE:BTCUSDT",
    interval: options.interval || "1D",
    width: options.width || 800,
    height: options.height || 600,
    theme: options.theme || "dark",
  };
}

// ヘルパー関数: エラーハンドリング
function handleError(error: unknown): { errorMessage: string; statusCode: number } {
  let errorMessage = "Unknown error";
  let statusCode = 500;

  if (error instanceof ChartValidationError) {
    errorMessage = error.message;
    statusCode = 400;
  } else if (error instanceof ChartGenerationError) {
    errorMessage = error.message;
    statusCode = 502;
  } else if (error instanceof StorageUploadError) {
    errorMessage = "Failed to store chart image";
    statusCode = 503;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return { errorMessage, statusCode };
}

// TradingViewチャートスナップショット作成 + R2アップロード
imageRoutes.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const options: ChartSnapshotOptions = {
      symbol: body.symbol || "BINANCE:BTCUSDT",
      interval: body.interval || "1D",
      width: body.width || 800,
      height: body.height || 600,
      theme: body.theme || "dark",
    };

    // 環境変数から設定を取得
    const envResult = validateEnvironment(c);
    if ("error" in envResult) {
      return envResult.error;
    }
    const { apiKey, r2Bucket, customDomain } = envResult;

    // サービスインスタンスを作成
    const chartService = new ChartService(apiKey);
    const storageService = new StorageService(r2Bucket, customDomain);

    // リクエストを検証してチャートスナップショットを作成
    const chartRequest = createChartRequest(options);
    const chartResult = await chartService.createSnapshot(chartRequest);

    // R2にアップロード
    const uploadResult = await storageService.uploadChartImage(chartResult.imageBuffer, chartRequest.symbol, {
      interval: chartRequest.interval,
      theme: chartRequest.theme,
      width: chartRequest.width,
      height: chartRequest.height,
      generatedAt: chartResult.metadata.generatedAt,
    });

    const response: ChartAPIResponse = {
      success: true,
      data: {
        fileName: uploadResult.fileName,
        publicUrl: uploadResult.publicUrl,
        symbol: chartRequest.symbol,
        interval: chartRequest.interval,
        width: chartRequest.width,
        height: chartRequest.height,
        theme: chartRequest.theme,
        uploadedAt: uploadResult.uploadedAt,
        size: uploadResult.size,
        etag: uploadResult.etag,
      },
    };

    logger.info("Snapshot request completed successfully", {
      fileName: uploadResult.fileName,
      symbol: chartRequest.symbol,
      size: uploadResult.size,
    });

    return c.json(response);
  } catch (error) {
    logger.error("Snapshot creation error", { error });

    const { errorMessage, statusCode } = handleError(error);
    const response: ChartAPIResponse = {
      success: false,
      error: errorMessage,
    };

    return c.json(response, statusCode as 400 | 500 | 502 | 503);
  }
});

// 画像一覧を取得
imageRoutes.get("/list", async (c) => {
  try {
    const symbol = c.req.query("symbol");
    const limit = parseInt(c.req.query("limit") || "20");
    const cursor = c.req.query("cursor");
    const sortBy = c.req.query("sortBy") as "uploadedAt" | "symbol" | "size" | undefined;
    const sortOrder = c.req.query("sortOrder") as "asc" | "desc" | undefined;

    const r2Bucket = c.env.TRADINGVIEW_BUCKET;
    const customDomain = process.env.CUSTOM_DOMAIN || "your-custom-domain.com";

    if (!r2Bucket) {
      logger.error("R2 bucket not configured");
      return c.json({ error: "Storage not configured" }, 500);
    }

    const storageService = new StorageService(r2Bucket, customDomain);
    const imageService = new ImageService(storageService);

    const result = await imageService.getImageList({
      symbol,
      limit,
      cursor,
      sortBy,
      sortOrder,
    });

    const response: ImageListResponse = {
      success: true,
      data: {
        images: result.images,
        count: result.images.length,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };

    logger.info("Image list request completed", {
      count: result.images.length,
      symbol,
      hasMore: result.hasMore,
    });

    return c.json(response);
  } catch (error) {
    logger.error("List images error", { error });

    const response: ImageListResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return c.json(response, 500);
  }
});

// 画像統計を取得
imageRoutes.get("/stats", async (c) => {
  try {
    const symbol = c.req.query("symbol");

    const r2Bucket = c.env.TRADINGVIEW_BUCKET;
    const customDomain = process.env.CUSTOM_DOMAIN || "your-custom-domain.com";

    if (!r2Bucket) {
      logger.error("R2 bucket not configured");
      return c.json({ error: "Storage not configured" }, 500);
    }

    const storageService = new StorageService(r2Bucket, customDomain);
    const imageService = new ImageService(storageService);

    const stats = await imageService.getImageStatistics(symbol);

    logger.info("Image statistics request completed", {
      symbol,
      totalImages: stats.totalImages,
      totalSize: stats.totalSize,
    });

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Get image statistics error", { error });

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// 特定の画像を削除
imageRoutes.delete("/:fileName", async (c) => {
  try {
    const fileName = c.req.param("fileName");

    const r2Bucket = c.env.TRADINGVIEW_BUCKET;
    const customDomain = process.env.CUSTOM_DOMAIN || "your-custom-domain.com";

    if (!r2Bucket) {
      logger.error("R2 bucket not configured");
      return c.json({ error: "Storage not configured" }, 500);
    }

    const storageService = new StorageService(r2Bucket, customDomain);
    const imageService = new ImageService(storageService);

    await imageService.deleteImage(fileName);

    logger.info("Image deleted successfully", { fileName });

    return c.json({
      success: true,
      message: `Image ${fileName} deleted successfully`,
    });
  } catch (error) {
    logger.error("Delete image error", { error });

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// 古い画像をクリーンアップ
imageRoutes.post("/cleanup", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const olderThanDays = body.olderThanDays || 30;

    const r2Bucket = c.env.TRADINGVIEW_BUCKET;
    const customDomain = process.env.CUSTOM_DOMAIN || "your-custom-domain.com";

    if (!r2Bucket) {
      logger.error("R2 bucket not configured");
      return c.json({ error: "Storage not configured" }, 500);
    }

    const storageService = new StorageService(r2Bucket, customDomain);
    const imageService = new ImageService(storageService);

    const result = await imageService.cleanupOldImages(olderThanDays);

    logger.info("Image cleanup completed", {
      deletedCount: result.deletedCount,
      olderThanDays,
    });

    return c.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        olderThanDays,
        message: `Deleted ${result.deletedCount} images older than ${olderThanDays} days`,
      },
    });
  } catch (error) {
    logger.error("Cleanup images error", { error });

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

export { imageRoutes };
