import { readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChartImageFile } from "../types/chart.js";

const chartsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/charts");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export const list = async (): Promise<ChartImageFile[]> => {
  const categories = await readdir(chartsDirectory, { withFileTypes: true });
  const images: ChartImageFile[] = [];

  for (const category of categories) {
    if (!category.isDirectory()) continue;

    const categoryPath = resolve(chartsDirectory, category.name);
    const files = await readdir(categoryPath, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile() || !supportedExtensions.has(extname(file.name).toLowerCase())) continue;

      images.push({
        category: category.name,
        fileName: file.name,
        filePath: resolve(categoryPath, file.name)
      });
    }
  }

  return images.sort((first, second) =>
    first.category.localeCompare(second.category) || first.fileName.localeCompare(second.fileName)
  );
};

export const get = async (category: string, fileName: string): Promise<ChartImageFile | null> => {
  const images = await list();
  return images.find((image) => image.category === category && image.fileName === fileName) ?? null;
};
