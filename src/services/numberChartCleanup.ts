import { numberChartRetention } from "../config/numberCharts.js";
import * as numberChartSetModel from "../models/numberChartSetModel.js";
import { diffDays, getUtcToday } from "../utils/date.js";
import { removeSet } from "./numberChartSetService.js";

/** 剛建立、尚未寫入會員指標的 user 圖卡組不可視為孤兒 */
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

/**
 * 清除過期的圖卡組，回傳刪除的 ID：
 * - today：早於「今天 - TODAY_CHART_KEEP_DAYS」
 * - calculation：最後存取超過 CALCULATION_CHART_TTL_DAYS
 * - user：沒有會員指向（例如重建中途失敗留下的）
 * - 沒有 manifest 的資料夾（產生中途失敗留下的）
 */
export const cleanupNumberCharts = async (now = new Date()): Promise<string[]> => {
  const referencedUserSets = new Set((await numberChartSetModel.listUserPointers()).map((pointer) => pointer.setId));
  const today = getUtcToday(now);
  const removed: string[] = [];

  for (const setId of await numberChartSetModel.listSetIds()) {
    const manifest = await numberChartSetModel.findManifest(setId);
    const age = manifest ? now.getTime() - Date.parse(manifest.createdAt) : Infinity;

    const expired = !manifest
      || (manifest.kind === "today" && diffDays(today, manifest.input.birthDate) > numberChartRetention.todayKeepDays())
      || (manifest.kind === "calculation"
        && now.getTime() - Date.parse(manifest.lastAccessedAt) > numberChartRetention.calculationTtlMs())
      || (manifest.kind === "user" && !referencedUserSets.has(setId) && age > ORPHAN_GRACE_MS);

    if (expired) {
      await removeSet(setId);
      removed.push(setId);
    }
  }

  return removed;
};

/** 啟動時執行一次，之後定期執行；timer 不阻止行程結束 */
export const startNumberChartCleanup = () => {
  const run = () => cleanupNumberCharts().catch((error: unknown) => {
    console.error("[numberChartCleanup] failed:", error);
  });
  void run();
  setInterval(run, numberChartRetention.cleanupIntervalMs).unref();
};
