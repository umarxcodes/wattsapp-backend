// middlewares/error.middleware.js
/** Feature: Global error handling middleware */
/** Feature: Consistent error responses and logging */

import mongoose from "mongoose";
import { ApiError, ApiResponse } from "../utils/ApiResponse.util.js";

export const errorHandler = (err, req, res, next) => {
  void next;
  let error = err;

  // Handle Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new ApiError(400, `Validation Error: ${messages.join(", ")}`);
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ApiError(409, `${field} already exists`);
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Token expired");
  }

  // Handle Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    error = new ApiError(400, "File too large");
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    error = new ApiError(400, "Unexpected file field");
  }

  // Default to ApiError if not already one
  if (!(error instanceof ApiError)) {
    error = new ApiError(500, "Internal server error");
  }

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date().toISOString(),
    });
  } else {
    // Log production errors without sensitive info
    console.error("Error:", {
      message: error.message,
      statusCode: error.statusCode,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  const response = ApiResponse.error(error.statusCode, error.message);

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    response.stack = error.stack;
    response.details = error.details || null;
  }

  res.status(error.statusCode).json(response);
};

/* =====*** Error handling middleware implemented ***==== */
