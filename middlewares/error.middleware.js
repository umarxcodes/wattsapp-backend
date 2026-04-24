/* Centralized application error handling middleware */

import mongoose from "mongoose";
import { ApiError, ApiResponse } from "../utils/ApiResponse.util.js";
import env from "../config/env.config.js";

/* Handle application, database, authentication, and file upload errors */
export const errorHandler = (err, req, res, next) => {
  void next;

  /* Preserve original error reference for processing */
  let error = err;

  /* Handle Mongoose schema validation errors */
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);

    error = new ApiError(400, `Validation Error: ${messages.join(", ")}`);
  }

  /* Handle MongoDB duplicate key constraint errors */
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];

    error = new ApiError(409, `${field} already exists`);
  }

  /* Handle invalid JWT token errors */
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token");
  }

  /* Handle expired JWT token errors */
  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Token expired");
  }

  /* Handle file upload size limit errors */
  if (err.code === "LIMIT_FILE_SIZE") {
    error = new ApiError(400, "File too large");
  }

  /* Handle unexpected file field upload errors */
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    error = new ApiError(400, "Unexpected file field");
  }

  /* Convert unknown errors into standardized internal server errors */
  if (!(error instanceof ApiError)) {
    error = new ApiError(500, "Internal server error");
  }

  /* Log detailed error information in development environment */
  if (env.NODE_ENV === "development") {
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
    /* Log minimal production-safe error details */
    console.error("Error:", {
      message: error.message,
      statusCode: error.statusCode,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  /* Generate standardized API error response structure */
  const response = ApiResponse.error(error.statusCode, error.message);

  /* Attach debugging details only in development mode */
  if (env.NODE_ENV === "development") {
    response.stack = error.stack;
    response.details = error.details || null;
  }

  /* Send final error response to client */
  res.status(error.statusCode).json(response);
};
