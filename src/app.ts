import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/error.js';
import { requireChartsApiKey } from './middlewares/apiKey.js';
import chartsRoutes from './routes/chartsRoutes.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "200kb" }));

// CORS 設定
const corsOptions = {
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// 路由
app.use('/api/charts', requireChartsApiKey, chartsRoutes);

// ⚠️ 注意：錯誤處理 middleware 要放在所有 routes 後面
app.use(errorHandler);

export default app;