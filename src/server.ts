import app from "./app.js";
import { getChartKeySecret } from "./config/numberCharts.js";
import { startNumberChartCleanup } from "./services/numberChartCleanup.js";

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3000);

// 正式環境缺少金鑰時於啟動時失敗，不要等到第一次請求
getChartKeySecret();
startNumberChartCleanup();

app.listen(port, "0.0.0.0", () => console.log(
  isProduction ? `✅ Server running on port ${port}` : `🧪 Dev server running at http://localhost:${port}`
));
