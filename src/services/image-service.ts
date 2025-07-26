import type { ImageDetails, ImageListOptions } from "../types/services";
import {
  ImageCleanupError,
  ImageDeleteError,
  ImageDetailsError,
  ImageListError,
  ImageStatisticsError,
} from "../types/services";
import { logger } from "../utils/logger";
import type { StorageService } from "./storage-service";

/**
 * 画像管理のドメインロジックを担当するサービス
 * ストレージ固有の処理はStorageServiceに委譲し、ビジネスルールに集中
 */
export class ImageService {
  constructor(private storageService: StorageService) {}

  /**
   * アップロード済み画像の一覧を取得
   * ソート、フィルタリングなどのビジネスロジックを実装
   */
  async getImageList(options: ImageListOptions = {}): Promise<{
    images: ImageDetails[];
    hasMore: boolean;
    nextCursor?: string;
    totalCount?: number;
  }> {
    logger.info("Fetching image list", options);

    try {
      const result = await this.storageService.listChartImages({
        symbol: options.symbol,
        limit: options.limit || 20,
        cursor: options.cursor,
      });

      // ドメインモデルに変換
      let images: ImageDetails[] = result.images.map((img) => ({
        fileName: img.fileName,
        size: img.size,
        uploadedAt: img.uploadedAt,
        publicUrl: img.publicUrl,
        metadata: img.metadata,
        etag: "", // StorageServiceから取得する必要がある場合は後で実装
      }));

      // ソート処理
      if (options.sortBy) {
        images = this.sortImages(images, options.sortBy, options.sortOrder || "desc");
      }

      logger.info("Image list retrieved successfully", {
        count: images.length,
        hasMore: result.hasMore,
        symbol: options.symbol,
      });

      return {
        images,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      logger.error("Failed to get image list", { error, options });
      throw new ImageListError(
        `Failed to get image list: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * 特定のシンボルの画像統計を取得
   */
  async getImageStatistics(symbol?: string): Promise<{
    totalImages: number;
    totalSize: number;
    averageSize: number;
    latestImage?: ImageDetails;
    oldestImage?: ImageDetails;
    byTheme: Record<string, number>;
    byInterval: Record<string, number>;
  }> {
    logger.info("Getting image statistics", { symbol });

    try {
      // 全画像を取得（統計計算用）
      const allImages: ImageDetails[] = [];
      let cursor: string | undefined;

      do {
        const result = await this.getImageList({
          symbol,
          limit: 1000,
          cursor,
        });
        allImages.push(...result.images);
        cursor = result.nextCursor;
      } while (cursor);

      if (allImages.length === 0) {
        return {
          totalImages: 0,
          totalSize: 0,
          averageSize: 0,
          byTheme: {},
          byInterval: {},
        };
      }

      // 統計計算
      const totalSize = allImages.reduce((sum, img) => sum + img.size, 0);
      const averageSize = Math.round(totalSize / allImages.length);

      // テーマ別カウント
      const byTheme: Record<string, number> = {};
      const byInterval: Record<string, number> = {};

      allImages.forEach((img) => {
        if (img.metadata) {
          byTheme[img.metadata.theme] = (byTheme[img.metadata.theme] || 0) + 1;
          byInterval[img.metadata.interval] = (byInterval[img.metadata.interval] || 0) + 1;
        }
      });

      // 最新・最古の画像
      const sortedByDate = [...allImages].sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );

      const statistics = {
        totalImages: allImages.length,
        totalSize,
        averageSize,
        latestImage: sortedByDate[0],
        oldestImage: sortedByDate[sortedByDate.length - 1],
        byTheme,
        byInterval,
      };

      logger.info("Image statistics calculated", {
        symbol,
        totalImages: statistics.totalImages,
        totalSize: statistics.totalSize,
      });

      return statistics;
    } catch (error) {
      logger.error("Failed to get image statistics", { error, symbol });
      throw new ImageStatisticsError(
        `Failed to get image statistics: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * 特定の画像の詳細情報を取得
   */
  async getImageDetails(fileName: string): Promise<ImageDetails | null> {
    logger.debug("Getting image details", { fileName });

    try {
      const result = await this.storageService.getChartImage(fileName);

      if (!result) {
        logger.debug("Image not found", { fileName });
        return null;
      }

      return {
        fileName: result.metadata.fileName,
        size: result.metadata.size,
        uploadedAt: result.metadata.uploadedAt,
        publicUrl: `https://your-custom-domain.com/${result.metadata.fileName}`, // ドメインは設定から取得
        metadata: result.metadata.storageMetadata,
        etag: "", // 必要に応じて実装
      };
    } catch (error) {
      logger.error("Failed to get image details", { error, fileName });
      throw new ImageDetailsError(
        `Failed to get image details: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * 画像を削除
   */
  async deleteImage(fileName: string): Promise<void> {
    logger.info("Deleting image", { fileName });

    try {
      await this.storageService.deleteChartImage(fileName);
      logger.info("Image deleted successfully", { fileName });
    } catch (error) {
      logger.error("Failed to delete image", { error, fileName });
      throw new ImageDeleteError(
        `Failed to delete image: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * 古い画像をクリーンアップ
   */
  async cleanupOldImages(olderThanDays: number = 30): Promise<{ deletedCount: number }> {
    logger.info("Starting image cleanup", { olderThanDays });

    try {
      const result = await this.storageService.cleanupOldImages(olderThanDays);

      logger.info("Image cleanup completed", {
        deletedCount: result.deletedCount,
        olderThanDays,
      });

      return result;
    } catch (error) {
      logger.error("Failed to cleanup old images", { error, olderThanDays });
      throw new ImageCleanupError(
        `Failed to cleanup old images: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * サポートされているシンボルの一覧を取得
   */
  async getSupportedSymbols(): Promise<
    Array<{
      symbol: string;
      imageCount: number;
      latestUpload: string;
    }>
  > {
    logger.info("Getting supported symbols");

    try {
      const result = await this.getImageList({ limit: 1000 });
      const symbolMap = new Map<string, { count: number; latestUpload: string }>();

      result.images.forEach((img) => {
        if (img.metadata?.symbol) {
          const existing = symbolMap.get(img.metadata.symbol);
          const uploadDate = img.uploadedAt;

          if (!existing || new Date(uploadDate) > new Date(existing.latestUpload)) {
            symbolMap.set(img.metadata.symbol, {
              count: (existing?.count || 0) + 1,
              latestUpload: uploadDate,
            });
          } else {
            symbolMap.set(img.metadata.symbol, {
              ...existing,
              count: existing.count + 1,
            });
          }
        }
      });

      const symbols = Array.from(symbolMap.entries()).map(([symbol, data]) => ({
        symbol,
        imageCount: data.count,
        latestUpload: data.latestUpload,
      }));

      // シンボル名でソート
      symbols.sort((a, b) => a.symbol.localeCompare(b.symbol));

      logger.info("Supported symbols retrieved", { count: symbols.length });
      return symbols;
    } catch (error) {
      logger.error("Failed to get supported symbols", { error });
      throw new ImageListError(
        `Failed to get supported symbols: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * 画像のソート処理
   */
  private sortImages(
    images: ImageDetails[],
    sortBy: "uploadedAt" | "symbol" | "size",
    sortOrder: "asc" | "desc",
  ): ImageDetails[] {
    return images.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "uploadedAt":
          aValue = new Date(a.uploadedAt).getTime();
          bValue = new Date(b.uploadedAt).getTime();
          break;
        case "symbol":
          aValue = a.metadata?.symbol || "";
          bValue = b.metadata?.symbol || "";
          break;
        case "size":
          aValue = a.size;
          bValue = b.size;
          break;
        default:
          return 0;
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }
}
