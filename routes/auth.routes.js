/* Authentication routes with validation, rate limiting, and security middleware */

import express from "express";
import multer from "multer";

import {
  register,
  verifyOtp,
  resendOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  updateAvatar,
  deactivateAccount,
} from "../controllers/auth.controller.js";

import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";

import {
  loginLimiter,
  registerLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
} from "../middlewares/rateLimiter.middleware.js";

import * as validators from "../validation/auth.validator.js";

/* Configure in-memory file upload storage with size limit */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const router = express.Router();

/* Public authentication routes */

/* User registration with rate limiting and optional avatar upload */
router.post(
  "/register",
  registerLimiter,
  upload.single("avatar"),
  validate(validators.registerSchema),
  register
);

/* OTP verification for account activation */
router.post("/verify-otp", validate(validators.verifyOtpSchema), verifyOtp);

/* Resend OTP with rate limiting protection */
router.post(
  "/resend-otp",
  resendOtpLimiter,
  validate(validators.resendOtpSchema),
  resendOtp
);

/* User login with rate limiting and validation */
router.post("/login", loginLimiter, validate(validators.loginSchema), login);

/* Refresh authentication token */
router.post(
  "/refresh-token",
  validate(validators.refreshTokenSchema),
  refreshToken
);

/* User logout and session termination */
router.post("/logout", validate(validators.logoutSchema), logout);

/* Password recovery request with rate limiting */
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(validators.forgotPasswordSchema),
  forgotPassword
);

/* Password reset using secure token */
router.post(
  "/reset-password",
  validate(validators.resetPasswordSchema),
  resetPassword
);

/* Protected user routes (authentication required) */

/* Get authenticated user profile */
router.get("/profile", authenticate, getProfile);

/* Update user profile with optional avatar upload */
router.patch(
  "/profile",
  authenticate,
  upload.single("avatar"),
  validate(validators.updateProfileSchema),
  updateProfile
);

/* Update user avatar only */
router.patch(
  "/avatar",
  authenticate,
  upload.single("avatar"),
  validate(validators.updateAvatarSchema),
  updateAvatar
);

/* Deactivate user account */
router.delete("/account", authenticate, deactivateAccount);

/* Admin-only routes */

/* Placeholder for user management functionality */
router.get("/admin/users", authenticate, requireAdmin, (req, res) => {
  res.json({
    message: "Admin route - implement user management",
  });
});

export default router;
