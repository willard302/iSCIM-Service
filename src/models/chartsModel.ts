import { readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChartImageFile, DemoChartScope } from "../types/chart.js";

/**
 * Demo 靜態圖：`public/charts/{scope}/{category}/{fileName}`。
 * scope 為分析對象（今日、試算、demo 會員本人），category 為主題（numbers、five-elements）。
 */
const chartsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/charts");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export const DEMO_CHART_SCOPES: readonly DemoChartScope[] = ["today", "calculation", "demo-user-01"];

export const isDemoChartScope = (value: unknown): value is DemoChartScope =>
  DEMO_CHART_SCOPES.includes(value as DemoChartScope);

const readEntries = async (path: string) => {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
};

export const listCategory = async (scope: DemoChartScope, category: string): Promise<ChartImageFile[]> => {
  const categoryPath = resolve(chartsDirectory, scope, category);
  return (await readEntries(categoryPath))
    .filter((file) => file.isFile() && supportedExtensions.has(extname(file.name).toLowerCase()))
    .map((file) => ({ scope, category, fileName: file.name, filePath: resolve(categoryPath, file.name) }))
    .sort((first, second) => first.fileName.localeCompare(second.fileName));
};

export const list = async (): Promise<ChartImageFile[]> => {
  const images: ChartImageFile[] = [];
  for (const scope of DEMO_CHART_SCOPES) {
    const categories = (await readEntries(resolve(chartsDirectory, scope)))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    for (const category of categories) images.push(...await listCategory(scope, category));
  }
  return images;
};

/** 只回傳實際列在資料夾中的檔案，參數不會被當成路徑使用 */
export const get = async (scope: string, category: string, fileName: string): Promise<ChartImageFile | null> => {
  if (!isDemoChartScope(scope)) return null;
  const categories = (await readEntries(resolve(chartsDirectory, scope))).filter((entry) => entry.isDirectory());
  if (!categories.some((entry) => entry.name === category)) return null;
  return (await listCategory(scope, category)).find((image) => image.fileName === fileName) ?? null;
};
