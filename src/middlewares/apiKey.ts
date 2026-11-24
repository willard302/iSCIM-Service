import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * 只接受帶有共用金鑰的請求（模擬正式機：圖表只提供給前端專案的 server，不直接對外）。
 * 金鑰由環境變數 CHARTS_API_KEY 設定，請求以 X-Charts-Api-Key header 帶入。
 * 未設定 CHARTS_API_KEY 時：正式環境一律拒絕，本機開發不檢查。
 */
export const requireChartsApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.CHARTS_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ success: false, error: "Charts API key is not configured" });
    }
    return next();
  }

  const provided = Buffer.from(req.get("X-Charts-Api-Key") ?? "");
  const expected = Buffer.from(apiKey);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  next();
};
