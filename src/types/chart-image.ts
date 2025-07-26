/**
 * Chart-IMG API関連の型定義
 */

export interface ChartImageRequest {
  symbol: string;
  interval: string;
  width: number;
  height: number;
  theme: "light" | "dark";
}

export interface ChartImageResult {
  imageBuffer: ArrayBuffer;
  contentType: string;
  size: number;
}

export interface ChartImageOptions {
  timeout?: number;
  format?: "png" | "jpg" | "svg";
  backgroundColor?: string;
  timezone?: string;
  locale?: string;
}

/**
 * Chart-IMG API固有のエラー
 */
export class ChartImageApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "ChartImageApiError";
  }
}

/**
 * Chart-IMG APIリクエストバリデーションエラー
 */
export class ChartImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChartImageValidationError";
  }
}