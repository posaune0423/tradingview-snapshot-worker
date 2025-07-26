/**
 * R2ストレージ関連の型定義
 */

export interface R2UploadResult {
  key: string;
  etag: string;
  size: number;
  uploadedAt: Date;
}

export interface R2ObjectMetadata {
  key: string;
  size: number;
  etag: string;
  uploaded: Date;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
  customMetadata?: Record<string, string>;
}

export interface R2ListOptions {
  prefix?: string;
  cursor?: string;
  limit?: number;
  include?: ("httpMetadata" | "customMetadata")[];
}

export interface R2ListResult {
  objects: R2ObjectMetadata[];
  truncated: boolean;
  cursor?: string;
}
