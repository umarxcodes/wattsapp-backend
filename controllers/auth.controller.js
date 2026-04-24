// controllers/auth.controller.js
// ====*** Authentication Controllers ***===

import authService from "../services/auth.service.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import asyncHandler from "express-async-handler";
import env from "../config/env.config.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req, res) => {
  const { phone, countryCode, password, displayName } = req.body;
  const result = await authService.register(
    phone,
    countryCode,
    password,
    displayName,
    req.file
  );
  res.status(201).json(ApiResponse.created(result.message));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  const result = await authService.verifyOtp(phone, otp);

  res.cookie("refreshToken", result.refreshToken, cookieOptions);
  res.status(200).json(
    ApiResponse.success(200, result.message, {
      accessToken: result.accessToken,
      user: result.user,
    })
  );
});

export const resendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await authService.resendOtp(phone);
  res.status(200).json(ApiResponse.ok(result.message));
});

export const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const result = await authService.login(phone, password);

  res.cookie("refreshToken", result.refreshToken, cookieOptions);
  res.status(200).json(
    ApiResponse.success(200, result.message, {
      accessToken: result.accessToken,
      user: result.user,
    })
  );
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  const result = await authService.refreshToken(refreshToken);

  res.cookie("refreshToken", result.refreshToken, cookieOptions);
  res.status(200).json(
    ApiResponse.success(200, result.message, {
      accessToken: result.accessToken,
    })
  );
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  const result = await authService.logout(refreshToken);

  res.clearCookie("refreshToken");
  res.status(200).json(ApiResponse.ok(result.message));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await authService.forgotPassword(phone);
  res.status(200).json(ApiResponse.ok(result.message));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { phone, otp, newPassword } = req.body;
  const result = await authService.resetPassword(phone, otp, newPassword);
  res.status(200).json(ApiResponse.ok(result.message));
});

export const getProfile = asyncHandler(async (req, res) => {
  const result = await authService.getProfile(req.user.id);
  res
    .status(200)
    .json(ApiResponse.success(200, "Profile retrieved successfully", result));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { displayName } = req.body;
  const result = await authService.updateProfile(
    req.user.id,
    { displayName },
    req.file
  );
  res
    .status(200)
    .json(ApiResponse.success(200, result.message, { user: result.user }));
});

export const updateAvatar = asyncHandler(async (req, res) => {
  const result = await authService.updateAvatar(req.user.id, req.file);
  res
    .status(200)
    .json(ApiResponse.success(200, result.message, { user: result.user }));
});

export const deactivateAccount = asyncHandler(async (req, res) => {
  const result = await authService.deactivateAccount(req.user.id);
  res.clearCookie("refreshToken");
  res.status(200).json(ApiResponse.ok(result.message));
});

/* =====*** Auth controllers implemented ***==== */
