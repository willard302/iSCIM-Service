/** Demo 靜態圖的分析對象資料夾：今日、試算、demo 會員本人 */
export type DemoChartScope = "today" | "calculation" | "demo-user-01";

export interface ChartImageFile {
  scope: DemoChartScope;
  category: string;
  fileName: string;
  filePath: string;
}

export interface DemoChart {
  scope: DemoChartScope;
  category: string;
  fileName: string;
  url: string;
}
