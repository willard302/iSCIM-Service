const DAY_MS = 24 * 60 * 60 * 1000;

/** 驗證 `YYYY-MM-DD` 且為實際存在的日期（排除 2026-02-30 之類） */
export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/** UTC 的今日（YYYY-MM-DD） */
export const getUtcToday = (now = new Date()) => now.toISOString().slice(0, 10);

/** 兩個 YYYY-MM-DD 相差的天數（a - b） */
export const diffDays = (a: string, b: string) =>
  Math.round((Date.parse(`${a}T00:00:00.000Z`) - Date.parse(`${b}T00:00:00.000Z`)) / DAY_MS);
