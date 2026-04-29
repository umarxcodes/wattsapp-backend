import rateLimit from "express-rate-limit";
import { env } from "../config/env.config.js";

// ====*** Rate Limiter Factory ***=====

const createRateLimiter = (windowMs, max, message, options = {}) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === "test",
    keyGenerator: options.keyGenerator,
    message: {
      success: false,
      message,
    },
  });

// ====*** Rate Limiter Key Helpers ***=====

const getPhoneKey = (req) => req.body?.phone || "anonymous-phone";
const getAuthKey = (req) => req.user?.id || req.ip;

// ====*** Auth Rate Limiters ***=====

export const loginLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  "Too many login attempts. Please try again later.",
  {
    keyGenerator: (req) => `${req.ip}:${getPhoneKey(req)}`,
  }
);

export const registerLimiter = createRateLimiter(
  60 * 60 * 1000,
  5,
  "Too many registration attempts. Please try again later.",
  {
    keyGenerator: (req) => `${req.ip}:${getPhoneKey(req)}`,
  }
);

export const otpLimiter = createRateLimiter(
  10 * 60 * 1000,
  5,
  "Too many OTP requests. Please try again later.",
  {
    keyGenerator: (req) => `${req.ip}:${getPhoneKey(req)}`,
  }
);

export const resendOtpLimiter = otpLimiter;

export const forgotPasswordLimiter = createRateLimiter(
  30 * 60 * 1000,
  5,
  "Too many password reset requests. Please try again later.",
  {
    keyGenerator: (req) => `${req.ip}:${getPhoneKey(req)}`,
  }
);

// ====*** API Rate Limiters ***=====

export const generalLimiter = createRateLimiter(
  60 * 1000,
  120,
  "Too many requests. Please slow down."
);

export const sendMessageLimiter = createRateLimiter(
  60 * 1000,
  40,
  "Too many messages sent too quickly.",
  {
    keyGenerator: (req) =>
      `${getAuthKey(req)}:${req.params.conversationId || "unknown"}`,
  }
);

export const mediaUploadLimiter = createRateLimiter(
  60 * 1000,
  20,
  "Too many media uploads. Please slow down.",
  {
    keyGenerator: (req) =>
      `${getAuthKey(req)}:${req.params.conversationId || "unknown"}`,
  }
);

export const editMessageLimiter = createRateLimiter(
  60 * 1000,
  30,
  "Too many message edits. Please slow down.",
  {
    keyGenerator: (req) =>
      `${getAuthKey(req)}:${req.params.messageId || "unknown"}`,
  }
);

export const blockActionLimiter = createRateLimiter(
  10 * 60 * 1000,
  20,
  "Too many block actions. Please slow down.",
  {
    keyGenerator: (req) =>
      `${getAuthKey(req)}:${req.body?.blockedUserId || req.params.blockedUserId || "unknown"}`,
  }
);

export const groupActionLimiter = createRateLimiter(
  5 * 60 * 1000,
  40,
  "Too many group actions. Please slow down.",
  {
    keyGenerator: (req) =>
      `${getAuthKey(req)}:${req.params.groupId || "groups"}`,
  }
);

export const reactionLimiter = createRateLimiter(
  60 * 1000,
  60,
  "Too many reaction updates. Please slow down.",
  {
    keyGenerator: (req) =>
      `${getAuthKey(req)}:${req.params.messageId || "unknown"}`,
  }
);
