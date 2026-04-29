// ====*** API Response Class ***=====

export class ApiResponse {
  constructor(success, statusCode, message, data = null) {
    this.success = success;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  static success(statusCode, message, data = null) {
    return new ApiResponse(true, statusCode, message, data);
  }

  static ok(message, data = null) {
    return new ApiResponse(true, 200, message, data);
  }

  static created(message, data = null) {
    return new ApiResponse(true, 201, message, data);
  }

  static error(statusCode, message, data = null) {
    return new ApiResponse(false, statusCode, message, data);
  }
}

// ====*** API Error Class ***=====

export class ApiError extends Error {
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", details = null) {
    return new ApiError(400, message, details);
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

  static locked(message = "Resource locked") {
    return new ApiError(423, message);
  }
}
