import * as chartsModel from "../models/chartsModel.js";
import type { DemoChart } from "../types/chart.js";

export const toDemoChartUrl = (scope: string, category: string, fileName: string) =>
  `/api/charts/${encodeURIComponent(scope)}/${encodeURIComponent(category)}/${encodeURIComponent(fileName)}`;

export const listDemoCharts = async (): Promise<DemoChart[]> => {
  const images = await chartsModel.list();

  return images.map(({ scope, category, fileName }) => ({
    scope,
    category,
    fileName,
    url: toDemoChartUrl(scope, category, fileName),
  }));
};

export const getDemoChart = async (scope: string, category: string, fileName: string): Promise<string | null> => {
  const image = await chartsModel.get(scope, category, fileName);
  return image?.filePath ?? null;
};
