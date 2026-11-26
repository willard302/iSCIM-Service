import type { Request, Response } from "express";
import {
  deleteUserCharts,
  findChartFile,
  getCalculationCharts,
  getTodayCharts,
  upsertUserCharts,
} from "../services/numberChartsService.js";

// Express 5 會把 async handler 拋出的錯誤交給 errorHandler，不需 try/catch

export const getToday = async (req: Request, res: Response) => {
  res.status(200).json({ success: true, result: await getTodayCharts(req.params.date, req.query.cardIds) });
};

export const createCalculation = async (req: Request, res: Response) => {
  res.status(200).json({ success: true, result: await getCalculationCharts(req.body) });
};

export const upsertUser = async (req: Request, res: Response) => {
  res.status(200).json({ success: true, result: await upsertUserCharts(req.params.userId, req.body) });
};

export const deleteUser = async (req: Request, res: Response) => {
  await deleteUserCharts(req.params.userId);
  res.status(204).end();
};

export const getChartFile = async (req: Request, res: Response) => {
  const filePath = await findChartFile(req.params.setId, req.params.fileName);
  if (!filePath) {
    return res.status(404).json({ success: false, error: "Chart image not found" });
  }
  // 同一個網址的內容不會改變（會員資料變更時圖卡組 ID 也會改變）
  res.sendFile(filePath, { headers: { "Cache-Control": "private, max-age=86400, immutable" } });
};
