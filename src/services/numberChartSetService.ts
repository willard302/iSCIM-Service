import { numberChartRetention } from "../config/numberCharts.js";
import * as numberChartSetModel from "../models/numberChartSetModel.js";
import type {
  NumberChartInput,
  NumberChartSetKind,
  NumberChartSetManifest,
  NumberChartSetResult,
} from "../types/numberChart.js";
import { generateCard } from "./numberChartGenerator.js";

// 同一個圖卡組的操作依序執行：同時有多個相同輸入的請求時只產生一次
const setLocks = new Map<string, Promise<unknown>>();

export const withSetLock = <T>(setId: string, task: () => Promise<T>): Promise<T> => {
  const previous = setLocks.get(setId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(task);
  setLocks.set(setId, current);
  void current.finally(() => {
    if (setLocks.get(setId) === current) setLocks.delete(setId);
  }).catch(() => undefined);
  return current;
};

export const toChartUrl = (setId: string, fileName: string) =>
  `/api/charts/numbers/sets/${encodeURIComponent(setId)}/${encodeURIComponent(fileName)}`;

const toResult = (manifest: NumberChartSetManifest, cardIds: readonly string[]): NumberChartSetResult => {
  const requested = new Set(cardIds);
  return {
    setId: manifest.id,
    kind: manifest.kind,
    createdAt: manifest.createdAt,
    cards: manifest.cards
      .filter((card) => requested.has(card.cardId))
      .map((card) => ({ cardId: card.cardId, url: toChartUrl(manifest.id, card.fileName) })),
  };
};

interface EnsureSetOptions {
  id: string;
  kind: NumberChartSetKind;
  input: NumberChartInput;
  cardIds: readonly string[];
  now?: Date;
}

/** 取得圖卡組，不存在就建立；只補產生缺少的卡片，已產生的直接沿用 */
export const ensureSet = ({ id, kind, input, cardIds, now = new Date() }: EnsureSetOptions) =>
  withSetLock(id, async (): Promise<NumberChartSetResult> => {
    const timestamp = now.toISOString();
    const existing = await numberChartSetModel.findManifest(id);
    const manifest: NumberChartSetManifest = existing ?? {
      id,
      kind,
      input,
      cards: [],
      createdAt: timestamp,
      lastAccessedAt: timestamp,
    };

    const generatedIds = new Set(manifest.cards.map((card) => card.cardId));
    const missingIds = cardIds.filter((cardId) => !generatedIds.has(cardId));
    for (const cardId of missingIds) {
      manifest.cards.push(await generateCard(manifest.kind, manifest.input, cardId, numberChartSetModel.getSetDirectory(id)));
    }

    const shouldTouch = now.getTime() - Date.parse(manifest.lastAccessedAt) >= numberChartRetention.touchIntervalMs;
    if (shouldTouch) manifest.lastAccessedAt = timestamp;
    if (!existing || missingIds.length || shouldTouch) await numberChartSetModel.saveManifest(manifest);

    return toResult(manifest, cardIds);
  });

export const removeSet = (setId: string) => withSetLock(setId, () => numberChartSetModel.removeSet(setId));
