import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { ZodError } from "zod";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  if (error instanceof ZodError) {
    const message = "Validation Error";
    const errors = error.issues.map(( e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    error = new ApiError(400, message, errors);
  } else if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, [], err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
    ...(process.env.ENVIRONMENT === "development" ? { stack: error.stack } : {}),
  };

  res.status(error.statusCode).json(response);
};
