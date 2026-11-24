import type { Request, Response, NextFunction } from "express";

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const error = err instanceof Error ? err : new Error("Internal Server Error");
  const statusCode = typeof err === "object" && err !== null && "statusCode" in err
    && typeof err.statusCode === "number"
    ? err.statusCode
    : 500;

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? "Internal Server Error" : error.message,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack
  });
};