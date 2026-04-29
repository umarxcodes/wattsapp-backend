import asyncHandler from "express-async-handler";
import { env } from "../config/env.config.js";
import {
  deactivateAccount,
  forgotPassword,
  getProfile,
  login,
  logout,
  refreshToken,
  register,
  resendOtp,
  resetPassword,
  updateAvatar,
  updateProfile,
  verifyUserOtp,
} from "../services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";

// ====*** Refresh Token Cookie Options ***=====

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ====*** Auth Controller Actions ***=====

export const registerController = asyncHandler(async (req, res) => {
  const { phone, countryCode, password, displayName } = req.body;
  const result = await register(
    phone,
    countryCode,
    password,
    displayName,
    req.file
  );

  res.status(201).json(ApiResponse.created(result.message));
});

export const verifyOtpController = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await verifyUserOtp(phone, otp);

  res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);
  res.status(200).json(
    ApiResponse.ok(result.message, {
      accessToken: result.accessToken,
      user: result.user,
    })
  );
});

export const resendOtpController = asyncHandler(async (req, res) => {
  const result = await resendOtp(req.body.phone);
  res.status(200).json(ApiResponse.ok(result.message));
});

export const loginController = asyncHandler(async (req, res) => {
  const result = await login(req.body.phone, req.body.password);

  res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);
  res.status(200).json(
    ApiResponse.ok(result.message, {
      accessToken: result.accessToken,
      user: result.user,
    })
  );
});

export const refreshTokenController = asyncHandler(async (req, res) => {
  const result = await refreshToken(req.cookies.refreshToken);

  res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);
  res
    .status(200)
    .json(ApiResponse.ok(result.message, { accessToken: result.accessToken }));
});

export const logoutController = asyncHandler(async (req, res) => {
  const result = await logout(req.cookies.refreshToken);
  res.clearCookie("refreshToken", refreshTokenCookieOptions);
  res.status(200).json(ApiResponse.ok(result.message));
});

export const forgotPasswordController = asyncHandler(async (req, res) => {
  const result = await forgotPassword(req.body.phone);
  res.status(200).json(ApiResponse.ok(result.message));
});

export const resetPasswordController = asyncHandler(async (req, res) => {
  const { phone, otp, newPassword } = req.body;
  const result = await resetPassword(phone, otp, newPassword);
  res.status(200).json(ApiResponse.ok(result.message));
});

export const getProfileController = asyncHandler(async (req, res) => {
  const result = await getProfile(req.user.id);
  res.status(200).json(ApiResponse.ok("Profile fetched successfully", result));
});

export const updateProfileController = asyncHandler(async (req, res) => {
  const result = await updateProfile(
    req.user.id,
    { displayName: req.body.displayName },
    req.file
  );

  res.status(200).json(ApiResponse.ok(result.message, { user: result.user }));
});

export const updateAvatarController = asyncHandler(async (req, res) => {
  const result = await updateAvatar(req.user.id, req.file);
  res.status(200).json(ApiResponse.ok(result.message, { user: result.user }));
});

export const deactivateAccountController = asyncHandler(async (req, res) => {
  const result = await deactivateAccount(req.user.id);
  res.clearCookie("refreshToken", refreshTokenCookieOptions);
  res.status(200).json(ApiResponse.ok(result.message));
});
