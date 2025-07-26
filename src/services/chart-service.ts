import {
  CHART_CONFIG,
  CHART_INTERVALS,
  getTimeoutForToken,
  isRestrictedSymbol,
  POPULAR_SYMBOLS,
  SUPPORTED_SOLANA_EXCHANGES,
} from "../constants";
import { ChartImageClient } from "../libs/chart-img";
import type { ChartSnapshotRequest } from "../types/chart";
import type { ChartImageRequest } from "../types/chart-image";
import { ChartImageValidationError } from "../types/chart-image";
import type { ChartGenerationResult } from "../types/services";
import { ChartGenerationError, ChartValidationError } from "../types/services";
import { logger } from "../utils/logger";

/**
 * Solana DEX向けチャート生成のドメインロジックを担当するサービス
 * 外部API固有の処理は腐敗防止層に委譲し、ビジネスルールに集中
 */
export class ChartService {
  private chartImageClient: ChartImageClient;

  constructor(apiKey: string) {
    this.chartImageClient = new ChartImageClient(apiKey);
  }

  /**
   * Solana DEX向けチャートスナップショットを作成
   * ビジネスルールとドメイン固有の処理を実装
   */
  async createSnapshot(request: ChartSnapshotRequest): Promise<ChartGenerationResult> {
    logger.info("Creating Solana DEX chart snapshot", { request });

    try {
      // ドメイン固有のバリデーション
      this.validateBusinessRules(request);

      // 外部API向けリクエストに変換
      const chartRequest = this.mapToChartImageRequest(request);

      // 腐敗防止層を通じてチャート画像を生成
      const chartResult = await this.chartImageClient.generateChartImage(chartRequest, {
        timeout: getTimeoutForToken(this.extractTokenFromSymbol(request.symbol)),
        format: "png",
        locale: "en",
      });

      // ドメインモデルに変換して返却
      const result: ChartGenerationResult = {
        imageBuffer: chartResult.imageBuffer,
        contentType: chartResult.contentType,
        size: chartResult.size,
        metadata: {
          symbol: request.symbol,
          interval: request.interval,
          width: request.width,
          height: request.height,
          theme: request.theme,
          generatedAt: new Date(),
        },
      };

      logger.info("Chart snapshot created successfully", {
        symbol: request.symbol,
        size: result.size,
        contentType: result.contentType,
      });

      return result;
    } catch (error) {
      if (error instanceof ChartImageValidationError) {
        logger.warn("Chart validation failed", { error: error.message, request });
        throw new ChartValidationError(error.message);
      }

      logger.error("Failed to create chart snapshot", { error, request });
      throw new ChartGenerationError(
        `Chart snapshot creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Solana DEX向けビジネスルールレベルでのバリデーション
   */
  private validateBusinessRules(request: ChartSnapshotRequest): void {
    // シンボルフォーマットの検証
    const symbolValidation = this.chartImageClient.validateSymbolFormat(request.symbol);
    if (!symbolValidation.isValid) {
      throw new ChartValidationError(
        `Invalid symbol format: ${request.symbol}. Expected format for Solana DEX: DRIFT:SOL-PERP, RAYDIUM:SOL/USDC, etc.`,
      );
    }

    // ビジネス固有のルール
    if (isRestrictedSymbol(request.symbol)) {
      throw new ChartValidationError(`Symbol ${request.symbol} is not supported`);
    }

    // 画像サイズのビジネスルール
    const pixelCount = request.width * request.height;
    const maxPixelCount = CHART_CONFIG.maxSize.width * CHART_CONFIG.maxSize.height;
    if (pixelCount > maxPixelCount) {
      throw new ChartValidationError(
        `Image size is too large. Maximum pixel count is ${maxPixelCount.toLocaleString()}`,
      );
    }

    // Solana DEX固有の検証
    this.validateSolanaSymbol(request.symbol);

    // レート制限用の追加検証（将来実装）
    // this.checkRateLimit(request.symbol);
  }

  /**
   * Solana DEX固有のシンボル検証
   */
  private validateSolanaSymbol(symbol: string): void {
    const [exchange, pair] = symbol.split(":");

    if (!exchange || !pair) {
      throw new ChartValidationError(`Invalid symbol format: ${symbol}. Expected format: EXCHANGE:PAIR`);
    }

    // サポートされている取引所かチェック
    if (!SUPPORTED_SOLANA_EXCHANGES.includes(exchange.toUpperCase())) {
      throw new ChartValidationError(
        `Unsupported exchange: ${exchange}. Supported exchanges: ${SUPPORTED_SOLANA_EXCHANGES.join(", ")}`,
      );
    }
  }

  /**
   * シンボルからトークンを抽出
   */
  private extractTokenFromSymbol(symbol: string): string {
    const [, pair] = symbol.split(":");
    if (!pair) return "SOL"; // デフォルト

    // PERP形式の場合 (例: SOL-PERP)
    if (pair.includes("-PERP")) {
      return pair.replace("-PERP", "");
    }

    // ペア形式の場合 (例: SOL/USDC)
    if (pair.includes("/")) {
      const firstToken = pair.split("/")[0];
      return firstToken || "SOL";
    }

    // その他の場合は最初の部分を返す
    const firstMatch = pair.split(/[^A-Z]/)[0];
    return firstMatch || "SOL";
  }

  /**
   * ドメインモデルから外部API向けリクエストに変換
   */
  private mapToChartImageRequest(request: ChartSnapshotRequest): ChartImageRequest {
    return {
      symbol: request.symbol,
      interval: request.interval,
      width: request.width,
      height: request.height,
      theme: request.theme as "light" | "dark",
    };
  }

  /**
   * サポートされているSolana DEXの情報を取得
   */
  getSupportedExchanges(): string[] {
    return SUPPORTED_SOLANA_EXCHANGES;
  }

  /**
   * サポートされているインターバルの一覧を取得
   */
  getSupportedIntervals(): Array<{ value: string; label: string; category: string }> {
    return CHART_INTERVALS.map((interval) => ({
      value: interval.value,
      label: interval.label,
      category: interval.category,
    }));
  }

  /**
   * 人気のSolanaトークンシンボル一覧を取得
   */
  getPopularTokens(): string[] {
    return POPULAR_SYMBOLS;
  }
}
