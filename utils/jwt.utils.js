// utils/jwt.utils.js
/** Feature: JWT token generation, verification, and decoding utilities */
/** Feature: Separate access and refresh token handling */

import jwt from "jsonwebtoken";
import env from "../config/env.config.js";

export const generateAccessToken = (payload) => {
  try {
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
  } catch (error) {
    throw new Error("Failed to generate access token", { cause: error });
  }
};

export const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
  } catch (error) {
    throw new Error("Failed to generate refresh token", { cause: error });
  }
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired access token", { cause: error });
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired refresh token", { cause: error });
  }
};

export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error("Failed to decode token", { cause: error });
  }
};

export const generateTokenPair = (user) => {
  const payload = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/* =====*** JWT utilities implemented ***==== */
