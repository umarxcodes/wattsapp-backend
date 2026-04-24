/* Centralized API response and error handling utilities */

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

  /* Generic success response */
  static success(statusCode, message, data = null) {
    return new ApiResponse(true, statusCode, message, data);
  }

  /* Resource created response */
  static created(message, data = null) {
    return new ApiResponse(true, 201, message, data);
  }

  /* Standard OK response */
  static ok(message, data = null) {
    return new ApiResponse(true, 200, message, data);
  }

  /* No content response */
  static noContent() {
    return new ApiResponse(true, 204, "No content");
  }

  /* Generic error response */
  static error(statusCode, message, data = null) {
    return new ApiResponse(false, statusCode, message, data);
  }

  /* Bad request error */
  static badRequest(message = "Bad request") {
    return new ApiResponse(false, 400, message);
  }

  /* Unauthorized error */
  static unauthorized(message = "Unauthorized") {
    return new ApiResponse(false, 401, message);
  }

  /* Forbidden access error */
  static forbidden(message = "Forbidden") {
    return new ApiResponse(false, 403, message);
  }

  /* Resource not found error */
  static notFound(message = "Not found") {
    return new ApiResponse(false, 404, message);
  }

  /* Conflict error (duplicate or state conflict) */
  static conflict(message = "Conflict") {
    return new ApiResponse(false, 409, message);
  }

  /* Internal server error response */
  static internalServerError(message = "Internal server error") {
    return new ApiResponse(false, 500, message);
  }
}

/* Custom application error class for controlled exception handling */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);

    /* HTTP status code for response handling */
    this.statusCode = statusCode;

    /* Flag to distinguish operational vs system errors */
    this.isOperational = isOperational;

    /* Timestamp for debugging and logging */
    this.timestamp = new Date().toISOString();

    /* Preserve or generate stack trace */
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /* Standard bad request error */
  static badRequest(message = "Bad request") {
    return new ApiError(400, message);
  }

  /* Authentication failure error */
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  /* Authorization failure error */
  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  /* Resource not found error */
  static notFound(message = "Not found") {
    return new ApiError(404, message);
  }

  /* Conflict error (duplicate or invalid state) */
  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  /* Internal server error */
  static internalServerError(message = "Internal server error") {
    return new ApiError(500, message);
  }
}

export { ApiResponse, ApiError };
