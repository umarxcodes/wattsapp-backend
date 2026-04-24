/* Request rate limiting middleware configuration */

import rateLimit from "express-rate-limit";
import env from "../config/env.config.js";

/* Create reusable rate limiter middleware with custom rules */
const createRateLimiter = (windowMs, max, message) =>
  rateLimit({
    /* Define request time window in milliseconds */
    windowMs,

    /* Maximum number of allowed requests within time window */
    max,

    /* Standardized response returned when limit is exceeded */
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    },

    /* Enable modern rate limit headers */
    standardHeaders: true,

    /* Disable legacy X-RateLimit headers */
    legacyHeaders: false,

    /* Skip rate limiting during automated test environment */
    skip: () => env.NODE_ENV === "test",
  });

/* Limit repeated login attempts to prevent brute-force attacks */
export const loginLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  "Too many login attempts. Please try again in 15 minutes."
);

/* Limit new account registrations to prevent abuse */
export const registerLimiter = createRateLimiter(
  60 * 60 * 1000,
  3,
  "Too many registration attempts. Please try again in 1 hour."
);

/* Limit OTP generation requests for verification security */
export const otpLimiter = createRateLimiter(
  5 * 60 * 1000,
  3,
  "Too many OTP requests. Please try again in 5 minutes."
);

/* Limit OTP resend requests to prevent spam and abuse */
export const resendOtpLimiter = createRateLimiter(
  10 * 60 * 1000,
  2,
  "Too many resend OTP requests. Please try again in 10 minutes."
);

/* Limit forgot password requests for account protection */
export const forgotPasswordLimiter = createRateLimiter(
  30 * 60 * 1000,
  3,
  "Too many password reset attempts. Please try again in 30 minutes."
);

/* General API protection for frequently accessed routes */
export const generalLimiter = createRateLimiter(
  60 * 1000,
  10,
  "Too many requests. Please slow down."
);

/* Strict protection for highly sensitive endpoints */
export const strictLimiter = createRateLimiter(
  60 * 1000,
  3,
  "Too many requests. Please wait before trying again."
);
