import { Router } from "express";
import { getChartImage, getCharts } from "../controllers/chartsController.js";
import numberChartsRoutes from "./numberChartsRoutes.js";

const router = Router();

// 依輸入產生的數字圖卡組（today／calculation／user），須排在 demo 靜態圖之前
router.use("/numbers", numberChartsRoutes);

router.get("/", getCharts);
// scope：today／calculation／demo-user-01；category：numbers／five-elements
router.get("/:scope/:category/:fileName", getChartImage);

export default router;
