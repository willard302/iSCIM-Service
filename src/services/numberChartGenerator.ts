import { copyFile, mkdir, readdir, rename } from "node:fs/promises";
import { dirname, extname, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import type { NumberChartFile, NumberChartInput } from "../types/numberChart.js";

/**
 * 數字圖卡產生器。目前為 demo：以 public/charts/numbers 的範本圖代替，所有輸入產生相同的圖。
 * 正式版在 generateCard 依 input 繪製圖卡，介面不變，其餘流程（快取、保留、清理）不需更動。
 */
const templatesDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/charts/numbers");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

let templatesPromise: Promise<Map<string, string>> | null = null;

/** cardId → 範本檔名 */
const loadTemplates = () => {
  templatesPromise ??= readdir(templatesDirectory, { withFileTypes: true }).then((entries) => new Map(
    entries
      .filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()))
      .map((entry) => [parse(entry.name).name, entry.name] as const),
  ));
  return templatesPromise;
};

export const listSupportedCardIds = async (): Promise<string[]> => [...(await loadTemplates()).keys()].sort();

/** 產生一張圖卡並寫入 outputDirectory，回傳檔名 */
export const generateCard = async (
  _input: NumberChartInput,
  cardId: string,
  outputDirectory: string,
): Promise<NumberChartFile> => {
  const templateName = (await loadTemplates()).get(cardId);
  if (!templateName) throw new Error(`numberChartGenerator: unsupported card ${cardId}`);

  await mkdir(outputDirectory, { recursive: true });
  const outputPath = resolve(outputDirectory, templateName);
  const tempPath = `${outputPath}.${randomUUID()}.tmp`;
  await copyFile(resolve(templatesDirectory, templateName), tempPath);
  await rename(tempPath, outputPath);
  return { cardId, fileName: templateName };
};
