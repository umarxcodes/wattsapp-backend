/* JWT token utilities for authentication and session management */

import jwt from "jsonwebtoken";
import env from "../config/env.config.js";

/* Generate short-lived access token for API authentication */
export const generateAccessToken = (payload) => {
  try {
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
      expiresIn: "15m",
    });
  } catch (error) {
    throw new Error("Failed to generate access token", { cause: error });
  }
};

/* Generate long-lived refresh token for session renewal */
export const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });
  } catch (error) {
    throw new Error("Failed to generate refresh token", { cause: error });
  }
};

/* Verify and decode access token */
export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired access token", {
      cause: error,
    });
  }
};

/* Verify and decode refresh token */
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired refresh token", {
      cause: error,
    });
  }
};

/* Decode token without verifying signature (unsafe, use carefully) */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error("Failed to decode token", { cause: error });
  }
};

/* Generate access + refresh token pair for authenticated user */
export const generateTokenPair = (user) => {
  const payload = {
    id: user._id.toString(),
    phone: user.phone,
    displayName: user.displayName,
  };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};
