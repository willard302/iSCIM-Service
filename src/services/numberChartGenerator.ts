import { copyFile, mkdir, rename } from "node:fs/promises";
import { parse, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import * as chartsModel from "../models/chartsModel.js";
import type { DemoChartScope } from "../types/chart.js";
import type { NumberChartFile, NumberChartInput, NumberChartSetKind } from "../types/numberChart.js";

/**
 * 數字圖卡產生器。目前為 demo：依圖卡組種類使用 `public/charts/{scope}/numbers` 的範本圖
 * （today → today、calculation → calculation、user → demo-user-01），同種類的所有輸入產生相同的圖。
 * 正式版在 generateCard 依 input 繪製圖卡，介面不變，其餘流程（快取、保留、清理）不需更動。
 */
const TEMPLATE_SCOPES: Record<NumberChartSetKind, DemoChartScope> = {
  today: "today",
  calculation: "calculation",
  user: "demo-user-01",
};

const templatesByKind = new Map<NumberChartSetKind, Promise<Map<string, string>>>();

/** cardId → 範本檔案路徑 */
const loadTemplates = (kind: NumberChartSetKind) => {
  let templates = templatesByKind.get(kind);
  if (!templates) {
    templates = chartsModel.listCategory(TEMPLATE_SCOPES[kind], "numbers")
      .then((images) => new Map(images.map((image) => [parse(image.fileName).name, image.filePath] as const)));
    templatesByKind.set(kind, templates);
  }
  return templates;
};

export const listSupportedCardIds = async (kind: NumberChartSetKind): Promise<string[]> =>
  [...(await loadTemplates(kind)).keys()].sort();

/** 產生一張圖卡並寫入 outputDirectory，回傳檔名 */
export const generateCard = async (
  kind: NumberChartSetKind,
  _input: NumberChartInput,
  cardId: string,
  outputDirectory: string,
): Promise<NumberChartFile> => {
  const templatePath = (await loadTemplates(kind)).get(cardId);
  if (!templatePath) throw new Error(`numberChartGenerator: unsupported card ${cardId} for ${kind}`);

  const fileName = parse(templatePath).base;
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = resolve(outputDirectory, fileName);
  const tempPath = `${outputPath}.${randomUUID()}.tmp`;
  await copyFile(templatePath, tempPath);
  await rename(tempPath, outputPath);
  return { cardId, fileName };
};
