/** 帶有 HTTP 狀態碼的錯誤，由 middlewares/error.ts 轉為回應 */
export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}
