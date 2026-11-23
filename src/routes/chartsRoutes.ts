import { Router } from "express";
import { getChartImage, getCharts } from "../controllers/chartsController.js";

const router = Router();

router.get("/", getCharts);
router.get("/:category/:fileName", getChartImage);

export default router;
