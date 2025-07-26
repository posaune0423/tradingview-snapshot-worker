# TradingView Snapshot Worker

TradingViewのチャートスナップショットを取得し、Cloudflare R2ストレージにアップロードするモジュール化されたAPIです。

## 機能

- TradingViewチャートのスナップショット作成
- Cloudflare R2への自動アップロード
- アップロードした画像の一覧取得
- RESTful API設計
- CORS対応
- **モジュール化されたアーキテクチャ**
- **包括的なテストスイート**

## プロジェクト構造

```
src/
├── api.ts                    # Hono APIエンドポイント
├── constants/               # 定数定義
│   ├── dex-screener.ts     # DEX Screener関連定数
│   ├── exchanges.ts        # 取引所関連定数
│   ├── index.ts           # 定数のエクスポート
│   └── tokens.ts          # トークン関連定数
├── libs/                   # ライブラリ
│   ├── chart-img.ts       # Chart-IMG API関連
│   └── r2.ts              # R2ストレージ関連
├── routes/                 # ルート定義
│   └── image.ts           # 画像関連ルート
├── services/               # ビジネスロジック
│   ├── chart-service.ts   # Chart-IMG API通信
│   ├── image-service.ts   # 画像一覧管理
│   └── storage-service.ts # R2ストレージ管理
├── types/                  # 型定義
│   ├── chart.ts           # チャート関連型
│   ├── chart-image.ts     # チャート画像型
│   ├── r2.ts              # R2関連型
│   ├── services.ts        # サービス関連型
│   └── worker-configuration.d.ts # Worker設定型
├── utils/                  # ユーティリティ
│   ├── index.ts           # ユーティリティのエクスポート
│   └── logger.ts          # 構造化ログ
└── worker.ts               # Workerエントリーポイント

tests/
├── api.test.ts               # API統合テスト
├── chart-service.test.ts     # チャートサービステスト
├── helper-functions.test.ts  # ヘルパー関数テスト
├── image-routes.test.ts      # 画像ルートテスト
├── image-service.test.ts     # 画像サービステスト
└── storage-service.test.ts   # ストレージサービステスト
```

## アーキテクチャの特徴

### モジュール分離
- **ChartService**: Chart-IMG APIとの通信とバリデーション
- **StorageService**: R2ストレージへのアップロード管理
- **ImageService**: 画像一覧の取得と管理
- **API Layer**: Honoを使用したRESTful エンドポイント
- **Constants**: 取引所、トークン、DEX Screener関連の定数管理

### テスト可能な設計
- 各サービスが独立してテスト可能
- モック化によるユニットテスト
- API統合テスト
- 環境変数の適切な管理

### 型安全性
- TypeScript型定義による安全性
- サービス間のインターフェース定義
- リクエスト/レスポンスの型安全性

## 必要な設定

### 1. Chart-IMG API キー

[chart-img.com](https://chart-img.com) でアカウントを作成し、APIキーを取得してください。

### 2. Cloudflare R2 バケット

Cloudflareアカウントで以下を設定：

1. R2バケット `tradingview-snapshot-worker` を作成
2. カスタムドメインを設定（オプション）

### 3. 環境変数設定

`wrangler.jsonc` の `vars` セクションで Chart-IMG API キーを設定：

```jsonc
{
  "vars": {
    "CHART_IMG_API_KEY": "your_actual_api_key_here"
  },
  "r2_buckets": [
    {
      "binding": "TRADINGVIEW_BUCKET",
      "bucket_name": "tradingview-snapshot-worker"
    }
  ]
}
```

## セットアップ

```bash
# 依存関係のインストール
bun install

# 型定義の生成
bun run cf-typegen

# コードフォーマット
bun run format

# Linting
bun run lint

# テストの実行
bun test

# 監視モードでテスト実行
bun run test:watch

# 開発サーバーの起動
bun run dev

# デプロイ
bun run deploy
```

## テスト

各サービスは個別にテスト可能です：

```bash
# 全テストの実行
bun test

# 特定のテストファイルの実行
bun test tests/chart-service.test.ts

# 監視モードでテスト実行
bun run test:watch
```

**テストカバレッジ:**
- ChartService: API通信、バリデーション、エラーハンドリング
- StorageService: ファイルアップロード、ファイル名生成
- ImageService: 画像一覧取得、ドメイン管理
- API統合: 全エンドポイントの動作確認
- ヘルパー関数: ユーティリティ関数のテスト
- 画像ルート: ルートレベルの動作確認

## API エンドポイント

### GET /

ヘルスチェックとAPI情報を返します。

### POST /snapshot

TradingViewチャートのスナップショットを作成してR2にアップロードします。

**リクエスト例:**

```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "NASDAQ:AAPL",
    "interval": "1D", 
    "width": 1200,
    "height": 800,
    "theme": "dark"
  }'
```

**リクエストパラメータ:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|---|-----------|-----|
| symbol | string | "BINANCE:BTCUSDT" | TradingViewシンボル |
| interval | string | "1D" | 時間足 (1m, 5m, 15m, 1h, 4h, 1D, 1W, 1M) |
| width | number | 800 | 画像幅 |
| height | number | 600 | 画像高さ |
| theme | string | "dark" | テーマ ("light" or "dark") |

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "fileName": "2025-01-31T15-30-45-123Z_NASDAQ_AAPL.png",
    "publicUrl": "https://tradingview-snapshot-worker.YOUR_CUSTOM_DOMAIN.com/2025-01-31T15-30-45-123Z_NASDAQ_AAPL.png",
    "symbol": "NASDAQ:AAPL",
    "interval": "1D",
    "width": 1200,
    "height": 800,
    "theme": "dark",
    "uploadedAt": "2025-01-31T15:30:45.123Z"
  }
}
```

### GET /images

アップロード済み画像の一覧を取得します。

**レスポンス例:**

```json
{
  "success": true,
  "data": {
    "images": [
      {
        "fileName": "2025-01-31T15-30-45-123Z_NASDAQ_AAPL.png",
        "size": 12345,
        "uploadedAt": "2025-01-31T15:30:45.123Z",
        "publicUrl": "https://tradingview-snapshot-worker.YOUR_CUSTOM_DOMAIN.com/2025-01-31T15-30-45-123Z_NASDAQ_AAPL.png"
      }
    ],
    "count": 1
  }
}
```

## 対応TradingViewシンボル例

- **株式:** `NASDAQ:AAPL`, `NYSE:TSLA`, `TSE:7203`
- **仮想通貨:** `BINANCE:BTCUSDT`, `COINBASE:ETHUSD`
- **FX:** `OANDA:EURUSD`, `FX:GBPJPY`
- **先物:** `CME:ES1!`, `NYMEX:CL1!`

詳細は [Chart-IMG API ドキュメント](https://doc.chart-img.com/) を参照してください。

## 技術スタック

- **Runtime:** Cloudflare Workers
- **Framework:** Hono
- **Storage:** Cloudflare R2
- **Chart API:** Chart-IMG API v2
- **Package Manager:** Bun
- **Testing:** Bun Test
- **Language:** TypeScript
- **Code Quality:** Biome (Linting & Formatting)

## 開発ガイド

### 新しいサービスの追加

1. `src/services/` に新しいサービスファイルを作成
2. 対応する型定義を `src/types/` に追加
3. `tests/` にテストファイルを作成
4. `src/api.ts` でサービスを利用

### 定数の管理

プロジェクトで使用する定数は `src/constants/` で管理：

- `exchanges.ts`: 取引所関連の定数
- `tokens.ts`: トークン関連の定数
- `dex-screener.ts`: DEX Screener関連の定数

### コード品質

```bash
# コードフォーマット
bun run format

# Linting
bun run lint
```

### エラーハンドリング

全てのサービスで構造化ログとエラーハンドリングを実装：

```typescript
import { logger } from "../utils/logger.js";

try {
  // 処理
  logger.info("Operation completed", { data });
} catch (error) {
  logger.error("Operation failed", { error });
  throw error;
}
```

## 制限事項

- Chart-IMG APIの利用制限に依存
- R2ストレージ容量の制限
- Worker実行時間の制限（最大30秒）

## トラブルシューティング

### Chart-IMG APIエラー

- APIキーが正しく設定されているか確認
- リクエストパラメータが正しいか確認
- Chart-IMG APIの利用制限を確認

### R2アップロードエラー

- R2バケット `tradingview-snapshot-worker` が存在するか確認
- Workers設定でR2バインディング `TRADINGVIEW_BUCKET` が正しいか確認

### テストエラー

```bash
# テスト環境の確認
bun test --verbose

# 特定のテストをデバッグ
bun test tests/api.test.ts

# 監視モードでテスト実行
bun run test:watch
```

## ライセンス

MIT License
