/**
 * サービス層で使用する型定義
 */

// Chart Service関連
export interface ChartGenerationResult {
  imageBuffer: ArrayBuffer;
  contentType: string;
  size: number;
  metadata: {
    symbol: string;
    interval: string;
    width: number;
    height: number;
    theme: string;
    generatedAt: Date;
  };
}

export class ChartGenerationError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "ChartGenerationError";
  }
}

export class ChartValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChartValidationError";
  }
}

// Storage Service関連
export interface UploadResult {
  fileName: string;
  publicUrl: string;
  uploadedAt: string;
  size: number;
  etag: string;
}

export interface StorageMetadata {
  symbol: string;
  interval: string;
  theme: string;
  dimensions: string;
  generatedAt: string;
}

export class StorageUploadError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "StorageUploadError";
  }
}

export class StorageListError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "StorageListError";
  }
}

export class StorageGetError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "StorageGetError";
  }
}

export class StorageDeleteError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "StorageDeleteError";
  }
}

export class StorageCleanupError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "StorageCleanupError";
  }
}

// Image Service関連
export interface ImageListOptions {
  symbol?: string;
  limit?: number;
  cursor?: string;
  sortBy?: "uploadedAt" | "symbol" | "size";
  sortOrder?: "asc" | "desc";
}

export interface ImageDetails {
  fileName: string;
  size: number;
  uploadedAt: string;
  publicUrl: string;
  metadata?: {
    symbol: string;
    interval: string;
    theme: string;
    dimensions: string;
    generatedAt: string;
  };
  etag: string;
}

export class ImageListError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "ImageListError";
  }
}

export class ImageStatisticsError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "ImageStatisticsError";
  }
}

export class ImageDetailsError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "ImageDetailsError";
  }
}

export class ImageDeleteError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "ImageDeleteError";
  }
}

export class ImageCleanupError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "ImageCleanupError";
  }
}
