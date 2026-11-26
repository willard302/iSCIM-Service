import { Router } from "express";
import {
  createCalculation,
  deleteUser,
  getChartFile,
  getToday,
  upsertUser,
} from "../controllers/numberChartsController.js";

const router = Router();

router.get("/today/:date", getToday);
router.post("/calculations", createCalculation);
router.put("/users/:userId", upsertUser);
router.delete("/users/:userId", deleteUser);
router.get("/sets/:setId/:fileName", getChartFile);

export default router;
