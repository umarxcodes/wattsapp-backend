// routes/auth.routes.js
/** Feature: Authentication routes with proper middleware and validation */
/** Feature: Rate limiting and security measures */

import express from "express";
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
import multer from "multer";
import * as validators from "../validation/auth.validator.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const router = express.Router();

// Public routes
router.post(
  "/register",
  registerLimiter,
  upload.single("avatar"),
  validate(validators.registerSchema),
  register
);

router.post("/verify-otp", validate(validators.verifyOtpSchema), verifyOtp);

router.post(
  "/resend-otp",
  resendOtpLimiter,
  validate(validators.resendOtpSchema),
  resendOtp
);

router.post("/login", loginLimiter, validate(validators.loginSchema), login);

router.post(
  "/refresh-token",
  validate(validators.refreshTokenSchema),
  refreshToken
);

router.post("/logout", validate(validators.logoutSchema), logout);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(validators.forgotPasswordSchema),
  forgotPassword
);

router.post(
  "/reset-password",
  validate(validators.resetPasswordSchema),
  resetPassword
);

// Protected routes
router.get("/profile", authenticate, getProfile);

router.patch(
  "/profile",
  authenticate,
  upload.single("avatar"),
  validate(validators.updateProfileSchema),
  updateProfile
);

router.patch(
  "/avatar",
  authenticate,
  upload.single("avatar"),
  validate(validators.updateAvatarSchema),
  updateAvatar
);

router.delete("/account", authenticate, deactivateAccount);

// Admin routes
router.get("/admin/users", authenticate, requireAdmin, (req, res) => {
  // Placeholder for admin functionality
  res.json({ message: "Admin route - implement user management" });
});

export default router;
/* =====*** Auth routes implemented ***==== */
