// middlewares/rateLimiter.middleware.js
/** Feature: Rate limiting for auth endpoints to prevent abuse */
/** Feature: Different limits for different operations */

import rateLimit from "express-rate-limit";

const createRateLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  });

export const loginLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many login attempts. Please try again in 15 minutes."
);

export const registerLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3,
  "Too many registration attempts. Please try again in 1 hour."
);

export const otpLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  3,
  "Too many OTP requests. Please try again in 5 minutes."
);

export const resendOtpLimiter = createRateLimiter(
  10 * 60 * 1000, // 10 minutes
  2,
  "Too many resend OTP requests. Please try again in 10 minutes."
);

export const forgotPasswordLimiter = createRateLimiter(
  30 * 60 * 1000, // 30 minutes
  3,
  "Too many password reset attempts. Please try again in 30 minutes."
);

export const generalLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10,
  "Too many requests. Please slow down."
);

export const strictLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  3,
  "Too many requests. Please wait before trying again."
);

/* =====*** Rate limiters implemented ***==== */
