import type {
  ChartImageOptions,
  ChartImageRequest,
  ChartImageResult,
} from "../types/chart-image";
import { ChartImageApiError, ChartImageValidationError } from "../types/chart-image";
import { logger } from "../utils/logger";

/**
 * Chart-IMG APIとの通信を担当する腐敗防止層
 * 外部Chart-IMG APIの詳細を隠蔽し、アプリケーション固有のインターフェースを提供
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
  async generateChartImage(
    request: ChartImageRequest,
    options?: ChartImageOptions
  ): Promise<ChartImageResult> {
    this.validateRequest(request);

    logger.info("Generating chart image", {
      symbol: request.symbol,
      interval: request.interval,
      dimensions: `${request.width}x${request.height}`,
      theme: request.theme
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
        interval: request.interval
      });

      if (error instanceof ChartImageApiError) {
        throw error;
      }

      throw new ChartImageApiError(
        `Chart image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
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
        const errorText = await response.text().catch(() => "Unknown error");
        logger.error("Chart-IMG API request failed", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });

        throw new ChartImageApiError(
          `Chart-IMG API error: ${response.status} ${response.statusText} - ${errorText}`,
          response.status
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ChartImageApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ChartImageApiError(`Request timeout after ${timeoutMs}ms`, 408);
      }

      throw error;
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

    // オプションパラメータを追加
    if (options?.backgroundColor) {
      body.backgroundColor = options.backgroundColor;
    }

    if (options?.timezone) {
      body.timezone = options.timezone;
    }

    if (options?.locale) {
      body.locale = options.locale;
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

    if (!/^[A-Z0-9_:.]+$/i.test(request.symbol)) {
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
   */
  private isValidInterval(interval: string): boolean {
    const validIntervals = [
      "1", "3", "5", "15", "30", "45", // 分
      "1H", "2H", "3H", "4H", "6H", "8H", "12H", // 時間
      "1D", "2D", "3D", // 日
      "1W", "1M" // 週・月
    ];

    return validIntervals.includes(interval);
  }

  /**
   * サポートされているシンボル形式を検証
   */
  validateSymbolFormat(symbol: string): { isValid: boolean; exchange?: string; pair?: string } {
    // 形式: EXCHANGE:SYMBOL (例: BINANCE:BTCUSDT)
    const match = symbol.match(/^([A-Z0-9_]+):([A-Z0-9_]+)$/i);

    if (!match) {
      return { isValid: false };
    }

    return {
      isValid: true,
      exchange: match[1],
      pair: match[2],
    };
  }
}
