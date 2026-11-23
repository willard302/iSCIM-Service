import type { Request, Response, NextFunction } from "express";
import { getDemoChart, listDemoCharts } from "../services/chartsService.js";

export const getCharts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const charts = await listDemoCharts();
    res.status(200).json({
      success: true,
      result: charts
    });
  } catch (error) {
    next(error);
  }
};

export const getChartImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, fileName } = req.params;
    const filePath = await getDemoChart(category, fileName);

    if (!filePath) {
      return res.status(404).json({
        success: false,
        error: "Chart image not found"
      });
    }

    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};
