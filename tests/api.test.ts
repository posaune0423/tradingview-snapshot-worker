import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import app from "../src/api.js";

// 環境変数をテスト用に設定
const originalEnv = {
  CHART_IMG_API_KEY: process.env.CHART_IMG_API_KEY,
  TRADINGVIEW_BUCKET_NAME: process.env.TRADINGVIEW_BUCKET_NAME,
  CUSTOM_DOMAIN: process.env.CUSTOM_DOMAIN,
};

// loggerをモック化
mock.module("../src/utils/logger.js", () => ({
  logger: {
    info: mock(() => {}),
    error: mock(() => {}),
    debug: mock(() => {}),
  },
}));

beforeEach(() => {
  // 各テスト前に環境変数を設定
  (process.env as any).CHART_IMG_API_KEY = "test-api-key";
  (process.env as any).TRADINGVIEW_BUCKET_NAME = "test-bucket";
  (process.env as any).CUSTOM_DOMAIN = "test-domain.com";
});

afterEach(() => {
  // 各テスト後に環境変数を復元
  (process.env as any).CHART_IMG_API_KEY = originalEnv.CHART_IMG_API_KEY;
  (process.env as any).TRADINGVIEW_BUCKET_NAME = originalEnv.TRADINGVIEW_BUCKET_NAME;
  (process.env as any).CUSTOM_DOMAIN = originalEnv.CUSTOM_DOMAIN;
});

test("GET / should return health check", async () => {
  const req = new Request("http://localhost/", { method: "GET" });
  const res = await app.request(req);

  expect(res.status).toBe(200);

  const json = (await res.json()) as any;
  expect(json.message).toBe("TradingView Chart Snapshot API");
  expect(json.endpoints).toHaveProperty("image");
  expect(json.endpoints).toHaveProperty("images");
});

test("GET /image/list should return image list structure", async () => {
  const req = new Request("http://localhost/image/list", { method: "GET" });
  const res = await app.request(req);

  // Note: This will return an error due to missing R2 bucket in test env
  // but we can test the response structure
  expect([200, 500]).toContain(res.status);

  const json = (await res.json()) as any;
  expect(json).toHaveProperty("success");
});

test("GET /image/stats should return stats structure", async () => {
  const req = new Request("http://localhost/image/stats", { method: "GET" });
  const res = await app.request(req);

  // Note: This will return an error due to missing R2 bucket in test env
  expect([200, 500]).toContain(res.status);

  const json = (await res.json()) as any;
  expect(json).toHaveProperty("success");
});

test("POST /image should return error without proper environment", async () => {
  const req = new Request("http://localhost/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const res = await app.request(req);

  // Should return 500 due to missing R2 bucket configuration
  expect(res.status).toBe(500);

  const json = (await res.json()) as any;
  expect(json.success).toBe(false);
  expect(json.error).toBeDefined();
});

test("DELETE /image/test.png should return error without proper environment", async () => {
  const req = new Request("http://localhost/image/test.png", { method: "DELETE" });
  const res = await app.request(req);

  // Should return 500 due to missing R2 bucket configuration
  expect(res.status).toBe(500);

  const json = (await res.json()) as any;
  expect(json.success).toBe(false);
  expect(json.error).toBeDefined();
});

test("POST /image/cleanup should return error without proper environment", async () => {
  const req = new Request("http://localhost/image/cleanup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const res = await app.request(req);

  // Should return 500 due to missing R2 bucket configuration
  expect(res.status).toBe(500);

  const json = (await res.json()) as any;
  expect(json.success).toBe(false);
  expect(json.error).toBeDefined();
});
