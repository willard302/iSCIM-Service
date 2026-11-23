import * as chartsModel from "../models/chartsModel.js";
import type { DemoChart } from "../types/chart.js";

export const listDemoCharts = async (): Promise<DemoChart[]> => {
  const images = await chartsModel.list();

  return images.map(({ category, fileName }) => ({
    category,
    fileName,
    url: `/api/charts/${encodeURIComponent(category)}/${encodeURIComponent(fileName)}`
  }));
};

export const getDemoChart = async (category: string, fileName: string): Promise<string | null> => {
  const image = await chartsModel.get(category, fileName);
  return image?.filePath ?? null;
};
