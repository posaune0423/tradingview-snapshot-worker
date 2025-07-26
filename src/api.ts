import { Hono } from "hono";
import { cors } from "hono/cors";
import { imageRoutes } from "./routes/image";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// CORS設定
app.use("*", cors());

// ヘルスチェック
app.get("/", (c) => {
  return c.json({
    message: "TradingView Chart Snapshot API",
    version: "2.0.0",
    endpoints: {
      image: "POST /image",
      images: "GET /image/list",
      imageStats: "GET /image/stats",
      deleteImage: "DELETE /image/:fileName",
      cleanup: "POST /image/cleanup",
    },
  });
});

// 画像関連のルートを追加
app.route("/image", imageRoutes);

export default app;
