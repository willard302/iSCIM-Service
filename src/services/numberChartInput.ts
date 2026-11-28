import { createHmac } from "node:crypto";
import { getChartKeySecret } from "../config/numberCharts.js";
import type { Gender, NumberChartInput, NumberChartSetKind } from "../types/numberChart.js";
import { diffDays, getUtcToday, isIsoDate } from "../utils/date.js";
import { HttpError } from "../utils/httpError.js";
import { listSupportedCardIds } from "./numberChartGenerator.js";

const TIME_RULE = /^([01]\d|2[0-3]):[0-5]\d$/;
const GENDERS: readonly Gender[] = ["male", "female", "other"];
/** 會員 ID、圖卡組 ID、檔名只允許安全字元，避免路徑穿越 */
const SAFE_ID_RULE = /^[A-Za-z0-9_-]{1,80}$/;
const SAFE_FILE_RULE = /^[A-Za-z0-9_-]{1,80}\.(?:png|jpe?g|webp)$/;

export const isSafeId = (value: unknown): value is string => typeof value === "string" && SAFE_ID_RULE.test(value);
export const isSafeFileName = (value: unknown): value is string => typeof value === "string" && SAFE_FILE_RULE.test(value);

export const parseUserId = (value: unknown): string => {
  if (!isSafeId(value)) throw new HttpError(400, "User ID is invalid");
  return value;
};

/**
 * 「今天」依使用者裝置時區判定，各時區的當地日期最多與 UTC 差一天；
 * 只接受這個範圍，避免 today 成為不受限制的試算入口。
 */
export const parseTodayDate = (value: unknown, now = new Date()): string => {
  if (!isIsoDate(value)) throw new HttpError(400, "Date must be YYYY-MM-DD");
  if (Math.abs(diffDays(value, getUtcToday(now))) > 1) throw new HttpError(400, "Date is not today");
  return value;
};

/** 正規化輸入：欄位順序固定、省略空值，同樣的資料一定得到同樣的 digest */
export const parseChartInput = (payload: unknown, now = new Date()): NumberChartInput => {
  if (!payload || typeof payload !== "object") throw new HttpError(400, "Chart input is required");

  const { birthDate, birthTime, gender } = payload as Record<string, unknown>;
  if (!isIsoDate(birthDate)) throw new HttpError(400, "Birth date must be YYYY-MM-DD");
  if (diffDays(birthDate, getUtcToday(now)) > 1) throw new HttpError(400, "Birth date is in the future");
  if (birthTime !== undefined && (typeof birthTime !== "string" || !TIME_RULE.test(birthTime))) {
    throw new HttpError(400, "Birth time must be HH:mm");
  }
  if (gender !== undefined && !GENDERS.includes(gender as Gender)) {
    throw new HttpError(400, "Gender must be male, female or other");
  }

  return {
    birthDate,
    ...(birthTime ? { birthTime } : {}),
    ...(gender ? { gender: gender as Gender } : {}),
  };
};

/**
 * 要回傳的卡片；未指定時為該種類的全部範本。前端專案只會為已解鎖的會員要求付費卡片，
 * today 與試算只要求免費卡片，因此付費圖不會被產生。
 * 接受陣列或以逗號分隔的字串（GET query）。
 */
export const parseCardIds = async (value: unknown, kind: NumberChartSetKind): Promise<string[]> => {
  const supported = await listSupportedCardIds(kind);
  if (value === undefined) return supported;

  const cardIds = typeof value === "string" ? value.split(",").filter(Boolean) : value;
  if (!Array.isArray(cardIds) || cardIds.length === 0) throw new HttpError(400, "cardIds must be a non-empty list");

  const unknown = cardIds.filter((cardId) => typeof cardId !== "string" || !supported.includes(cardId));
  if (unknown.length) throw new HttpError(400, `Unknown card IDs: ${unknown.join(", ")}`);
  return [...new Set(cardIds as string[])];
};

/** 輸入的 HMAC，作為 calculation 圖卡組 ID 與會員資料是否變更的判斷 */
export const digestInput = (input: NumberChartInput): string =>
  createHmac("sha256", getChartKeySecret())
    .update(JSON.stringify([input.birthDate, input.birthTime ?? null, input.gender ?? null]))
    .digest("hex")
    .slice(0, 32);
