import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/** 讀取用的請求公開，使用者端可直接開啟圖表 API 與圖片網址 */
const PUBLIC_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * 會建立、修改、刪除資料的請求（POST／PUT／DELETE）須帶共用金鑰，只給前端專案的 server 呼叫。
 * 金鑰由環境變數 CHARTS_API_KEY 設定，請求以 X-Charts-Api-Key header 帶入。
 * 未設定 CHARTS_API_KEY 時：正式環境一律拒絕，本機開發不檢查。
 */
export const requireChartsApiKey = (req: Request, res: Response, next: NextFunction) => {
  if (PUBLIC_METHODS.has(req.method)) return next();

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
