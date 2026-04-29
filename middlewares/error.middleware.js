import mongoose from "mongoose";
import { ZodError } from "zod";
import { env } from "../config/env.config.js";
import { ApiError, ApiResponse } from "../utils/ApiResponse.util.js";

// ====*** Error Normalization Middleware ***=====

export const errorHandler = (error, req, res, next) => {
  void next;

  let normalizedError = error;

  if (error instanceof ZodError) {
    normalizedError = ApiError.badRequest(
      "Validation failed",
      error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }))
    );
  } else if (error instanceof mongoose.Error.ValidationError) {
    normalizedError = ApiError.badRequest(
      "Validation failed",
      Object.values(error.errors).map((item) => item.message)
    );
  } else if (error instanceof mongoose.Error.CastError) {
    normalizedError = ApiError.badRequest(`Invalid ${error.path}`);
  } else if (error?.code === 11000) {
    const duplicateField = Object.keys(
      error.keyPattern || error.keyValue || {}
    )[0];
    normalizedError = ApiError.conflict(
      `${duplicateField || "Resource"} already exists`
    );
  } else if (!(error instanceof ApiError)) {
    normalizedError = new ApiError(
      500,
      error.message || "Internal server error"
    );
  }

  if (env.NODE_ENV !== "test") {
    console.error("Request error:", {
      method: req.method,
      path: req.originalUrl,
      statusCode: normalizedError.statusCode,
      message: normalizedError.message,
    });
  }

  const response = ApiResponse.error(
    normalizedError.statusCode,
    normalizedError.message,
    normalizedError.details
  );

  if (env.NODE_ENV === "development") {
    response.stack = normalizedError.stack;
  }

  res.status(normalizedError.statusCode).json(response);
};
