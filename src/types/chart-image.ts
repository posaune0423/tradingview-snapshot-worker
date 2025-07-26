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
  // Chart-IMG API v2 specific parameters
  indicators?: ChartIndicator[];
  drawings?: ChartDrawing[];
  style?: ChartStyle;
  scalesFontSize?: number;
  showLegendValues?: boolean;
  showSeriesLastValue?: boolean;
  showPriceLine?: boolean;
  showSeriesOHLC?: boolean;
  showBarChange?: boolean;
  mainPaneHeight?: number;
  priceRange?: PriceRange;
  shiftLeft?: number;
  shiftRight?: number;
  moveLeft?: number;
  moveRight?: number;
  zoomIn?: number;
  zoomOut?: number;
  // Custom watermark for ULTRA and ENTERPRISE plans
  watermark?: {
    text?: string;
    opacity?: number;
  };
}

export interface ChartIndicator {
  name: string;
  inputs?: Record<string, any>;
  styles?: Record<string, any>;
  pane?: number;
}

export interface ChartDrawing {
  type: string;
  points?: Array<{ time: number; price: number }>;
  properties?: Record<string, any>;
}

export type ChartStyle =
  | "bar"
  | "candle"
  | "line"
  | "area"
  | "heikin_ashi"
  | "hollow_candle"
  | "baseline"
  | "hi_lo"
  | "column";

export interface PriceRange {
  from?: number;
  to?: number;
  margin?: number;
}

/**
 * Chart-IMG API固有のエラー
 */
export class ChartImageApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly originalError?: unknown,
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
