import type {
  ChartDrawing,
  ChartImageOptions,
  ChartImageRequest,
  ChartImageResult,
  ChartIndicator,
  ChartStyle,
} from "../types/chart-image";
import { ChartImageApiError, ChartImageValidationError } from "../types/chart-image";
import { logger } from "../utils/logger";

/**
 * Chart-IMG APIとの通信を担当する腐敗防止層
 * 外部Chart-IMG APIの詳細を隠蔽し、アプリケーション固有のインターフェースを提供
 *
 * @see https://doc.chart-img.com/#introduction
 */
export class ChartImageClient {
  private readonly baseUrl = "https://api.chart-img.com/v2/tradingview/advanced-chart";
  private readonly defaultTimeout = 30000; // 30秒

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new Error("Chart-IMG API key is required");
    }
  }

  /**
   * TradingViewチャートの画像を生成
   */
  async generateChartImage(request: ChartImageRequest, options?: ChartImageOptions): Promise<ChartImageResult> {
    this.validateRequest(request);

    logger.info("Generating chart image", {
      symbol: request.symbol,
      interval: request.interval,
      dimensions: `${request.width}x${request.height}`,
      theme: request.theme,
    });

    try {
      const requestBody = this.buildRequestBody(request, options);
      const response = await this.makeApiRequest(requestBody, options?.timeout);

      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/png";

      logger.info("Chart image generated successfully", {
        symbol: request.symbol,
        size: imageBuffer.byteLength,
        contentType,
      });

      return {
        imageBuffer,
        contentType,
        size: imageBuffer.byteLength,
      };
    } catch (error) {
      logger.error("Failed to generate chart image", {
        error,
        symbol: request.symbol,
        interval: request.interval,
      });

      if (error instanceof ChartImageApiError) {
        throw error;
      }

      throw new ChartImageApiError(
        `Chart image generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }
  }

  /**
   * API リクエストを実行
   */
  private async makeApiRequest(requestBody: any, timeout?: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutMs = timeout || this.defaultTimeout;

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "content-type": "application/json",
          "user-agent": "TradingView-Snapshot-Worker/1.0",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleApiError(response);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ChartImageApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new ChartImageApiError(`Request timeout after ${timeoutMs}ms`, 408);
      }

      throw error;
    }
  }

  /**
   * API エラーレスポンスを処理
   */
  private async handleApiError(response: Response): Promise<never> {
    let errorData: any;

    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      errorData = { message: "Unknown error" };
    }

    logger.error("Chart-IMG API request failed", {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
    });

    // Chart-IMG API v2/v3 error format handling
    if (Array.isArray(errorData)) {
      // Validation errors array format
      const validationErrors = errorData.map((err) => `${err.param}: ${err.msg}`).join(", ");
      throw new ChartImageApiError(`Validation error: ${validationErrors}`, response.status, errorData);
    } else if (errorData.message) {
      // Standard error message format
      throw new ChartImageApiError(errorData.message, response.status, errorData);
    } else {
      // Fallback error format
      throw new ChartImageApiError(
        `Chart-IMG API error: ${response.status} ${response.statusText}`,
        response.status,
        errorData,
      );
    }
  }

  /**
   * リクエストボディを構築
   */
  private buildRequestBody(request: ChartImageRequest, options?: ChartImageOptions): any {
    const body: any = {
      symbol: request.symbol,
      interval: request.interval,
      width: request.width,
      height: request.height,
      theme: request.theme,
      format: options?.format || "png",
    };

    // Basic optional parameters
    if (options?.backgroundColor) {
      body.backgroundColor = options.backgroundColor;
    }

    if (options?.timezone) {
      body.timezone = options.timezone;
    }

    if (options?.locale) {
      body.locale = options.locale;
    }

    // Chart-IMG API v2 specific parameters
    if (options?.indicators && options.indicators.length > 0) {
      body.indicators = options.indicators;
    }

    if (options?.drawings && options.drawings.length > 0) {
      body.drawings = options.drawings;
    }

    if (options?.style) {
      body.style = options.style;
    }

    if (options?.scalesFontSize !== undefined) {
      body.scalesFontSize = options.scalesFontSize;
    }

    if (options?.showLegendValues !== undefined) {
      body.showLegendValues = options.showLegendValues;
    }

    if (options?.showSeriesLastValue !== undefined) {
      body.showSeriesLastValue = options.showSeriesLastValue;
    }

    if (options?.showPriceLine !== undefined) {
      body.showPriceLine = options.showPriceLine;
    }

    if (options?.showSeriesOHLC !== undefined) {
      body.showSeriesOHLC = options.showSeriesOHLC;
    }

    if (options?.showBarChange !== undefined) {
      body.showBarChange = options.showBarChange;
    }

    if (options?.mainPaneHeight !== undefined) {
      body.mainPaneHeight = options.mainPaneHeight;
    }

    if (options?.priceRange) {
      body.priceRange = options.priceRange;
    }

    // Navigation parameters (shiftLeft/shiftRight deprecated in favor of moveLeft/moveRight)
    if (options?.moveLeft !== undefined) {
      body.moveLeft = options.moveLeft;
    } else if (options?.shiftLeft !== undefined) {
      // Fallback for backward compatibility
      body.shiftLeft = options.shiftLeft;
    }

    if (options?.moveRight !== undefined) {
      body.moveRight = options.moveRight;
    } else if (options?.shiftRight !== undefined) {
      // Fallback for backward compatibility
      body.shiftRight = options.shiftRight;
    }

    if (options?.zoomIn !== undefined) {
      body.zoomIn = options.zoomIn;
    }

    if (options?.zoomOut !== undefined) {
      body.zoomOut = options.zoomOut;
    }

    // Custom watermark (ULTRA and ENTERPRISE plans only)
    if (options?.watermark) {
      body.watermark = options.watermark;
    }

    return body;
  }

  /**
   * リクエストパラメータの検証
   */
  private validateRequest(request: ChartImageRequest): void {
    if (!request.symbol) {
      throw new ChartImageValidationError("Symbol is required");
    }

    if (!/^[A-Z0-9_:./-]+$/i.test(request.symbol)) {
      throw new ChartImageValidationError("Invalid symbol format");
    }

    if (!request.interval) {
      throw new ChartImageValidationError("Interval is required");
    }

    if (!this.isValidInterval(request.interval)) {
      throw new ChartImageValidationError(`Invalid interval: ${request.interval}`);
    }

    if (!Number.isInteger(request.width) || request.width < 100 || request.width > 2000) {
      throw new ChartImageValidationError("Width must be an integer between 100 and 2000");
    }

    if (!Number.isInteger(request.height) || request.height < 100 || request.height > 2000) {
      throw new ChartImageValidationError("Height must be an integer between 100 and 2000");
    }

    if (!["light", "dark"].includes(request.theme)) {
      throw new ChartImageValidationError("Theme must be 'light' or 'dark'");
    }
  }

  /**
   * インターバルの有効性を検証
   * Chart-IMG API documentation に基づいて更新
   */
  private isValidInterval(interval: string): boolean {
    const validIntervals = [
      // 分単位
      "1",
      "3",
      "5",
      "15",
      "30",
      "45",
      // 時間単位 (Chart-IMG APIは6h, 12hをサポート)
      "1H",
      "2H",
      "3H",
      "4H",
      "6H",
      "8H",
      "12H",
      "6h",
      "12h", // Chart-IMG API documentation (July 20, 2024 update)
      // 日単位
      "1D",
      "2D",
      "3D",
      // 週・月単位
      "1W",
      "1M",
    ];

    return validIntervals.includes(interval);
  }

  /**
   * サポートされているシンボル形式を検証
   */
  validateSymbolFormat(symbol: string): { isValid: boolean; exchange?: string; pair?: string } {
    // 形式: EXCHANGE:SYMBOL (例: BINANCE:BTCUSDT, RAYDIUM:SOL/USDC, DRIFT:SOL-PERP)
    const match = symbol.match(/^([A-Z0-9_]+):([A-Z0-9_/-]+)$/i);

    if (!match) {
      return { isValid: false };
    }

    return {
      isValid: true,
      exchange: match[1],
      pair: match[2],
    };
  }

  /**
   * Helper method to create chart indicators
   * @see https://doc.chart-img.com/#tradingview-chart-indicators
   */
  static createIndicator(
    name: string,
    inputs?: Record<string, any>,
    styles?: Record<string, any>,
    pane?: number,
  ): ChartIndicator {
    return {
      name,
      inputs,
      styles,
      pane,
    };
  }

  /**
   * Helper method to create chart drawings
   * @see https://doc.chart-img.com/#tradingview-chart-drawings
   */
  static createDrawing(
    type: string,
    points?: Array<{ time: number; price: number }>,
    properties?: Record<string, any>,
  ): ChartDrawing {
    return {
      type,
      points,
      properties,
    };
  }

  /**
   * Get list of supported chart styles
   * @see https://doc.chart-img.com/#tradingview-chart-styles
   */
  static getSupportedStyles(): ChartStyle[] {
    return ["bar", "candle", "line", "area", "heikin_ashi", "hollow_candle", "baseline", "hi_lo", "column"];
  }

  /**
   * Get list of supported intervals
   */
  static getSupportedIntervals(): string[] {
    return [
      // 分単位
      "1",
      "3",
      "5",
      "15",
      "30",
      "45",
      // 時間単位
      "1H",
      "2H",
      "3H",
      "4H",
      "6H",
      "8H",
      "12H",
      "6h",
      "12h",
      // 日単位
      "1D",
      "2D",
      "3D",
      // 週・月単位
      "1W",
      "1M",
    ];
  }
}
