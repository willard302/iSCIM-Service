import { resolve } from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEV_KEY_SECRET = "iscim-dev-only-chart-key-secret";

/** 產生的圖卡存放位置：預設為 `<cwd>/storage`，部署時以 STORAGE_DIR 指向持久磁碟 */
export const getStorageDirectory = () => resolve(process.cwd(), process.env.STORAGE_DIR || "storage");

/**
 * 計算 calculation 圖卡組 ID 的 HMAC 金鑰：生日組合有限，一般雜湊可被暴力反推，HMAC 讓圖卡網址不洩漏生日。
 * 正式環境未設定時拒絕啟動；本機開發使用固定的開發用金鑰。
 */
export const getChartKeySecret = (): string => {
  const secret = process.env.CHART_KEY_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CHART_KEY_SECRET is not configured");
  }
  return DEV_KEY_SECRET;
};

const readDays = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const numberChartRetention = {
  /** calculation 圖卡組最後一次存取後保留的時間 */
  calculationTtlMs: () => readDays("CALCULATION_CHART_TTL_DAYS", 7) * DAY_MS,
  /** today 圖卡組保留到「今天」之前幾天 */
  todayKeepDays: () => readDays("TODAY_CHART_KEEP_DAYS", 2),
  /** 更新 lastAccessedAt 的最短間隔，避免每次讀取都寫檔 */
  touchIntervalMs: 60 * 60 * 1000,
  /** 清理工作的執行間隔 */
  cleanupIntervalMs: 60 * 60 * 1000,
};
