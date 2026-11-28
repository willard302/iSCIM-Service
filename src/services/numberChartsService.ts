import { randomUUID } from "node:crypto";
import * as numberChartSetModel from "../models/numberChartSetModel.js";
import type { NumberChartSetResult } from "../types/numberChart.js";
import {
  digestInput,
  isSafeFileName,
  isSafeId,
  parseCardIds,
  parseChartInput,
  parseTodayDate,
  parseUserId,
} from "./numberChartInput.js";
import { ensureSet, removeSet, withSetLock } from "./numberChartSetService.js";

/**
 * 三種數字圖卡組：
 * - today：以當天日期為生日，同一天全站共用（`today-{date}`）
 * - calculation：依輸入即時產生，相同輸入共用（`calc-{HMAC}`）
 * - user：每位會員各自一份（`user-{uuid}`），資料變更時重建並刪除舊的
 */

export const getTodayCharts = async (date: unknown, cardIds: unknown): Promise<NumberChartSetResult> => {
  const today = parseTodayDate(date);
  return ensureSet({
    id: `today-${today}`,
    kind: "today",
    input: { birthDate: today },
    cardIds: await parseCardIds(cardIds, "today"),
  });
};

export const getCalculationCharts = async (payload: unknown): Promise<NumberChartSetResult> => {
  const input = parseChartInput(payload);
  return ensureSet({
    id: `calc-${digestInput(input)}`,
    kind: "calculation",
    input,
    cardIds: await parseCardIds((payload as Record<string, unknown>).cardIds, "calculation"),
  });
};

export const upsertUserCharts = async (userIdValue: unknown, payload: unknown): Promise<NumberChartSetResult> => {
  const userId = parseUserId(userIdValue);
  const input = parseChartInput(payload);
  const cardIds = await parseCardIds((payload as Record<string, unknown>).cardIds, "user");
  const inputDigest = digestInput(input);

  return withSetLock(`user:${userId}`, async () => {
    const pointer = await numberChartSetModel.findUserPointer(userId);
    if (pointer?.inputDigest === inputDigest) {
      return ensureSet({ id: pointer.setId, kind: "user", input, cardIds });
    }

    // 首次建立或資料已變更：建立新的圖卡組，網址隨之改變，舊圖的快取不會被沿用
    const setId = `user-${randomUUID()}`;
    const result = await ensureSet({ id: setId, kind: "user", input, cardIds });
    await numberChartSetModel.saveUserPointer(userId, { setId, inputDigest });
    if (pointer) await removeSet(pointer.setId);
    return result;
  });
};

/** 刪除會員的圖卡（帳號刪除時呼叫）；不存在時視為成功 */
export const deleteUserCharts = async (userIdValue: unknown): Promise<void> => {
  const userId = parseUserId(userIdValue);
  await withSetLock(`user:${userId}`, async () => {
    const pointer = await numberChartSetModel.findUserPointer(userId);
    await numberChartSetModel.removeUserPointer(userId);
    if (pointer) await removeSet(pointer.setId);
  });
};

/** 圖卡檔案的路徑；只回傳 manifest 中列出的檔案 */
export const findChartFile = async (setId: unknown, fileName: unknown): Promise<string | null> => {
  if (!isSafeId(setId) || !isSafeFileName(fileName)) return null;
  const manifest = await numberChartSetModel.findManifest(setId);
  if (!manifest?.cards.some((card) => card.fileName === fileName)) return null;
  return numberChartSetModel.getChartFilePath(setId, fileName);
};
