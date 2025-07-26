import type { R2ListOptions, R2ListResult, R2ObjectMetadata, R2UploadResult } from "../types/r2";
import { logger } from "../utils/logger";

/**
 * R2ストレージとの通信を担当する腐敗防止層
 * Cloudflare R2 APIの詳細を隠蔽し、アプリケーション固有のインターフェースを提供
 */
export class R2Client {
  private readonly bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  /**
   * オブジェクトをR2バケットにアップロード
   */
  async uploadObject(
    key: string,
    data: ArrayBuffer | ReadableStream | string | Blob,
    options?: {
      contentType?: string;
      cacheControl?: string;
      customMetadata?: Record<string, string>;
    },
  ): Promise<R2UploadResult> {
    logger.info("Uploading object to R2", { key, size: data instanceof ArrayBuffer ? data.byteLength : "unknown" });

    try {
      const putOptions: R2PutOptions = {};

      if (options?.contentType || options?.cacheControl) {
        putOptions.httpMetadata = {
          contentType: options.contentType,
          cacheControl: options.cacheControl,
        };
      }

      if (options?.customMetadata) {
        putOptions.customMetadata = options.customMetadata;
      }

      const result = await this.bucket.put(key, data, putOptions);

      if (!result) {
        throw new Error("Failed to upload object to R2");
      }

      logger.info("Successfully uploaded object to R2", {
        key: result.key,
        etag: result.etag,
        size: result.size,
      });

      return {
        key: result.key,
        etag: result.etag,
        size: result.size,
        uploadedAt: result.uploaded,
      };
    } catch (error) {
      logger.error("Failed to upload object to R2", { error, key });
      throw new Error(`R2 upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * オブジェクトのメタデータを取得
   */
  async getObjectMetadata(key: string): Promise<R2ObjectMetadata | null> {
    logger.debug("Getting object metadata from R2", { key });

    try {
      const object = await this.bucket.head(key);

      if (!object) {
        logger.debug("Object not found in R2", { key });
        return null;
      }

      return {
        key: object.key,
        size: object.size,
        etag: object.etag,
        uploaded: object.uploaded,
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
      };
    } catch (error) {
      logger.error("Failed to get object metadata from R2", { error, key });
      throw new Error(`R2 head operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * オブジェクトの内容を取得
   */
  async getObject(key: string): Promise<{ body: ReadableStream; metadata: R2ObjectMetadata } | null> {
    logger.debug("Getting object from R2", { key });

    try {
      const object = await this.bucket.get(key);

      if (!object) {
        logger.debug("Object not found in R2", { key });
        return null;
      }

      return {
        body: object.body,
        metadata: {
          key: object.key,
          size: object.size,
          etag: object.etag,
          uploaded: object.uploaded,
          httpMetadata: object.httpMetadata,
          customMetadata: object.customMetadata,
        },
      };
    } catch (error) {
      logger.error("Failed to get object from R2", { error, key });
      throw new Error(`R2 get operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * オブジェクト一覧を取得
   */
  async listObjects(options?: R2ListOptions): Promise<R2ListResult> {
    logger.debug("Listing objects from R2", options);

    try {
      const listOptions: R2ListOptions = {
        prefix: options?.prefix,
        cursor: options?.cursor,
        limit: options?.limit || 1000,
        include: options?.include || ["httpMetadata", "customMetadata"],
      };

      const result = await this.bucket.list(listOptions);

      const objects: R2ObjectMetadata[] = result.objects.map((obj) => ({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
        uploaded: obj.uploaded,
        httpMetadata: obj.httpMetadata,
        customMetadata: obj.customMetadata,
      }));

      logger.debug("Successfully listed objects from R2", {
        count: objects.length,
        truncated: result.truncated,
      });

      return {
        objects,
        truncated: result.truncated,
        cursor: result.truncated ? result.cursor : undefined,
      };
    } catch (error) {
      logger.error("Failed to list objects from R2", { error });
      throw new Error(`R2 list operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * オブジェクトを削除
   */
  async deleteObject(key: string): Promise<void> {
    logger.info("Deleting object from R2", { key });

    try {
      await this.bucket.delete(key);
      logger.info("Successfully deleted object from R2", { key });
    } catch (error) {
      logger.error("Failed to delete object from R2", { error, key });
      throw new Error(`R2 delete operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * 複数のオブジェクトを一括削除
   */
  async deleteObjects(keys: string[]): Promise<void> {
    logger.info("Deleting multiple objects from R2", { count: keys.length });

    try {
      await this.bucket.delete(keys);
      logger.info("Successfully deleted multiple objects from R2", { count: keys.length });
    } catch (error) {
      logger.error("Failed to delete multiple objects from R2", { error, count: keys.length });
      throw new Error(`R2 bulk delete operation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * プリサインドURLを生成（将来実装）
   * 現在のR2 Workers APIではプリサインドURLの直接生成はサポートされていないため、
   * カスタムドメインやWorkerでの署名が必要
   */
  generatePresignedUrl(key: string, expiresIn: number): string {
    // 現在はプレースホルダー実装
    // 実際の実装では、カスタムドメインやWorker内での署名処理が必要
    throw new Error("Presigned URL generation not implemented yet");
  }
}
