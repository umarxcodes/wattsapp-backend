// utils/ApiResponse.util.js
/** Feature: Centralized API response and error handling utilities */
/** Feature: Consistent response format across all endpoints */

class ApiResponse {
  constructor(
    success,
    statusCode,
    message,
    data = null,
    timestamp = new Date().toISOString()
  ) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = timestamp;
  }

  static success(statusCode, message, data = null) {
    return new ApiResponse(true, statusCode, message, data);
  }

  static created(message, data = null) {
    return new ApiResponse(true, 201, message, data);
  }

  static ok(message, data = null) {
    return new ApiResponse(true, 200, message, data);
  }

  static noContent() {
    return new ApiResponse(true, 204, "No content");
  }

  static error(statusCode, message, data = null) {
    return new ApiResponse(false, statusCode, message, data);
  }

  static badRequest(message = "Bad request") {
    return new ApiResponse(false, 400, message);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiResponse(false, 401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiResponse(false, 403, message);
  }

  static notFound(message = "Not found") {
    return new ApiResponse(false, 404, message);
  }

  static conflict(message = "Conflict") {
    return new ApiResponse(false, 409, message);
  }

  static internalServerError(message = "Internal server error") {
    return new ApiResponse(false, 500, message);
  }
}

class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = "Bad request") {
    return new ApiError(400, message);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  static internalServerError(message = "Internal server error") {
    return new ApiError(500, message);
  }
}

export { ApiResponse, ApiError };
/* =====*** API response utilities enhanced ***==== */
