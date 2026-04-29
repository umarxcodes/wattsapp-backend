import express from "express";
import multer from "multer";
import {
  deactivateAccountController,
  forgotPasswordController,
  getProfileController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resendOtpController,
  resetPasswordController,
  updateAvatarController,
  updateProfileController,
  verifyOtpController,
} from "../controllers/auth.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";
import {
  forgotPasswordLimiter,
  loginLimiter,
  otpLimiter,
  registerLimiter,
  resendOtpLimiter,
} from "../middlewares/rateLimiter.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  updateAvatarSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from "../validation/auth.validator.js";

// ====*** Auth Upload Middleware ***=====

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const authRouter = express.Router();

// ====*** Public Auth Routes ***=====

authRouter.post(
  "/register",
  registerLimiter,
  upload.single("avatar"),
  validate(registerSchema),
  registerController
);

authRouter.post(
  "/verify-otp",
  otpLimiter,
  validate(verifyOtpSchema),
  verifyOtpController
);

authRouter.post(
  "/resend-otp",
  resendOtpLimiter,
  validate(resendOtpSchema),
  resendOtpController
);

authRouter.post("/login", loginLimiter, validate(loginSchema), loginController);

authRouter.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  refreshTokenController
);

authRouter.post("/logout", validate(logoutSchema), logoutController);

authRouter.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  forgotPasswordController
);

authRouter.post(
  "/reset-password",
  validate(resetPasswordSchema),
  resetPasswordController
);

// ====*** Protected Auth Routes ***=====

authRouter.get("/profile", authenticate, getProfileController);

authRouter.patch(
  "/profile",
  authenticate,
  upload.single("avatar"),
  validate(updateProfileSchema),
  updateProfileController
);

authRouter.patch(
  "/avatar",
  authenticate,
  upload.single("avatar"),
  validate(updateAvatarSchema),
  updateAvatarController
);

authRouter.delete("/account", authenticate, deactivateAccountController);

// ====*** Admin Routes ***=====

authRouter.get("/admin/users", authenticate, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: "Admin route placeholder",
  });
});
