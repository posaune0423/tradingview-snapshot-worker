import { R2Client } from "../libs/r2";
import type { StorageMetadata, UploadResult } from "../types/services";
import {
  StorageCleanupError,
  StorageDeleteError,
  StorageGetError,
  StorageListError,
  StorageUploadError,
} from "../types/services";
import { logger } from "../utils/logger";

/**
 * ストレージ操作のドメインロジックを担当するサービス
 * R2固有の処理は腐敗防止層に委譲し、ビジネスルールに集中
 */
export class StorageService {
  private r2Client: R2Client;
  private customDomain: string;

  constructor(r2Bucket: R2Bucket, customDomain: string) {
    this.r2Client = new R2Client(r2Bucket);
    this.customDomain = customDomain;
  }

  /**
   * チャート画像をストレージにアップロード
   * ファイル名生成、メタデータ付与などのビジネスロジックを実装
   */
  async uploadChartImage(
    imageBuffer: ArrayBuffer,
    symbol: string,
    metadata: {
      interval: string;
      theme: string;
      width: number;
      height: number;
      generatedAt: Date;
    },
  ): Promise<UploadResult> {
    const fileName = this.generateFileName(symbol, metadata);

    logger.info("Uploading chart image to storage", {
      fileName,
      symbol,
      size: imageBuffer.byteLength,
    });

    try {
      // ストレージメタデータを構築
      const storageMetadata = this.buildStorageMetadata(symbol, metadata);

      // 腐敗防止層を通じてアップロード
      const uploadResult = await this.r2Client.uploadObject(fileName, imageBuffer, {
        contentType: "image/png",
        cacheControl: "public, max-age=3600", // 1時間キャッシュ
        customMetadata: storageMetadata,
      });

      // ビジネスドメインの結果に変換
      const result: UploadResult = {
        fileName: uploadResult.key,
        publicUrl: this.buildPublicUrl(uploadResult.key),
        uploadedAt: uploadResult.uploadedAt.toISOString(),
        size: uploadResult.size,
        etag: uploadResult.etag,
      };

      logger.info("Chart image uploaded successfully", {
        fileName: result.fileName,
        publicUrl: result.publicUrl,
        size: result.size,
      });

      return result;
    } catch (error) {
      logger.error("Failed to upload chart image", {
        error,
        fileName,
        symbol,
        size: imageBuffer.byteLength,
      });
      throw new StorageUploadError(
        `Failed to upload chart image: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * 保存されているチャート画像の一覧を取得
   */
  async listChartImages(options?: { symbol?: string; limit?: number; cursor?: string }): Promise<{
    images: Array<{
      fileName: string;
      publicUrl: string;
      size: number;
      uploadedAt: string;
      metadata?: StorageMetadata;
    }>;
    hasMore: boolean;
    nextCursor?: string;
  }> {
    logger.info("Listing chart images", options);

    try {
      const prefix = options?.symbol ? this.getSymbolPrefix(options.symbol) : undefined;

      const listResult = await this.r2Client.listObjects({
        prefix,
        limit: options?.limit || 50,
        cursor: options?.cursor,
        include: ["httpMetadata", "customMetadata"],
      });

      const images = listResult.objects.map((obj) => ({
        fileName: obj.key,
        publicUrl: this.buildPublicUrl(obj.key),
        size: obj.size,
        uploadedAt: obj.uploaded.toISOString(),
        metadata: this.parseStorageMetadata(obj.customMetadata),
      }));

      logger.info("Chart images listed successfully", {
        count: images.length,
        hasMore: listResult.truncated,
      });

      return {
        images,
        hasMore: listResult.truncated,
        nextCursor: listResult.cursor,
      };
    } catch (error) {
      logger.error("Failed to list chart images", { error, options });
      throw new StorageListError(
        `Failed to list chart images: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * 特定のチャート画像を取得
   */
  async getChartImage(fileName: string): Promise<{
    body: ReadableStream;
    metadata: {
      fileName: string;
      size: number;
      contentType: string;
      uploadedAt: string;
      storageMetadata?: StorageMetadata;
    };
  } | null> {
    logger.debug("Getting chart image", { fileName });

    try {
      const result = await this.r2Client.getObject(fileName);

      if (!result) {
        logger.debug("Chart image not found", { fileName });
        return null;
      }

      return {
        body: result.body,
        metadata: {
          fileName: result.metadata.key,
          size: result.metadata.size,
          contentType: result.metadata.httpMetadata?.contentType || "image/png",
          uploadedAt: result.metadata.uploaded.toISOString(),
          storageMetadata: this.parseStorageMetadata(result.metadata.customMetadata),
        },
      };
    } catch (error) {
      logger.error("Failed to get chart image", { error, fileName });
      throw new StorageGetError(
        `Failed to get chart image: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * チャート画像を削除
   */
  async deleteChartImage(fileName: string): Promise<void> {
    logger.info("Deleting chart image", { fileName });

    try {
      await this.r2Client.deleteObject(fileName);
      logger.info("Chart image deleted successfully", { fileName });
    } catch (error) {
      logger.error("Failed to delete chart image", { error, fileName });
      throw new StorageDeleteError(
        `Failed to delete chart image: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * 古いチャート画像をクリーンアップ
   */
  async cleanupOldImages(olderThanDays: number = 30): Promise<{ deletedCount: number }> {
    logger.info("Starting cleanup of old chart images", { olderThanDays });

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      let deletedCount = 0;
      let cursor: string | undefined;

      do {
        const listResult = await this.r2Client.listObjects({
          limit: 1000,
          cursor,
          include: ["httpMetadata"],
        });

        const oldImages = listResult.objects.filter((obj) => obj.uploaded < cutoffDate);

        if (oldImages.length > 0) {
          const keysToDelete = oldImages.map((obj) => obj.key);
          await this.r2Client.deleteObjects(keysToDelete);
          deletedCount += oldImages.length;

          logger.info("Deleted batch of old images", {
            batchSize: oldImages.length,
            totalDeleted: deletedCount,
          });
        }

        cursor = listResult.cursor;
      } while (cursor);

      logger.info("Cleanup completed", { deletedCount, olderThanDays });
      return { deletedCount };
    } catch (error) {
      logger.error("Failed to cleanup old images", { error, olderThanDays });
      throw new StorageCleanupError(
        `Failed to cleanup old images: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * ファイル名を生成（タイムスタンプ + シンボル + 設定）
   */
  private generateFileName(
    symbol: string,
    metadata: {
      interval: string;
      theme: string;
      width: number;
      height: number;
      generatedAt: Date;
    },
  ): string {
    const timestamp = metadata.generatedAt.toISOString().replace(/[:.]/g, "-");
    const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, "_");
    const dimensions = `${metadata.width}x${metadata.height}`;

    return `charts/${timestamp}_${cleanSymbol}_${metadata.interval}_${metadata.theme}_${dimensions}.png`;
  }

  /**
   * シンボル用のプレフィックスを生成
   */
  private getSymbolPrefix(symbol: string): string {
    const cleanSymbol = symbol.replace(/[^a-zA-Z0-9]/g, "_");
    return `charts/${cleanSymbol}`;
  }

  /**
   * パブリックURLを構築
   */
  private buildPublicUrl(key: string): string {
    return `https://${this.customDomain}/${key}`;
  }

  /**
   * ストレージメタデータを構築
   */
  private buildStorageMetadata(
    symbol: string,
    metadata: {
      interval: string;
      theme: string;
      width: number;
      height: number;
      generatedAt: Date;
    },
  ): Record<string, string> {
    return {
      symbol,
      interval: metadata.interval,
      theme: metadata.theme,
      dimensions: `${metadata.width}x${metadata.height}`,
      generatedAt: metadata.generatedAt.toISOString(),
      version: "1.0",
    };
  }

  /**
   * ストレージメタデータを解析
   */
  private parseStorageMetadata(customMetadata?: Record<string, string>): StorageMetadata | undefined {
    if (!customMetadata) return undefined;

    const { symbol, interval, theme, dimensions, generatedAt } = customMetadata;

    if (!symbol || !interval || !theme || !dimensions || !generatedAt) {
      return undefined;
    }

    return {
      symbol,
      interval,
      theme,
      dimensions,
      generatedAt,
    };
  }
}
