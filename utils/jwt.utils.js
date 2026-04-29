import jwt from "jsonwebtoken";
import { env } from "../config/env.config.js";
import { createHash } from "node:crypto";

// ====*** JWT Algorithm Constants ***=====

const JWT_ALGORITHM = "HS256";

// ====*** Access Token Helpers ***=====

/**
 * Generate a signed access token.
 * @param {object} payload
 * @returns {string}
 */
export const generateAccessToken = (payload) =>
  jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
  });

/**
 * Verify an access token.
 * @param {string} token
 * @returns {object}
 */
export const verifyAccessToken = (token) =>
  jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
    algorithms: [JWT_ALGORITHM],
  });

// ====*** Refresh Token Helpers ***=====

/**
 * Generate a signed refresh token.
 * @param {object} payload
 * @returns {string}
 */
export const generateRefreshToken = (payload) =>
  jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  });

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {object}
 */
export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.REFRESH_TOKEN_SECRET, {
    algorithms: [JWT_ALGORITHM],
  });

// ====*** Token Pair Helpers ***=====

/**
 * Build the JWT payload for a user.
 * @param {object} user
 * @returns {object}
 */
export const buildAuthPayload = (user) => ({
  id: user._id.toString(),
  phone: user.phone,
  displayName: user.displayName,
});

/**
 * Generate access and refresh tokens for a user.
 * @param {object} user
 * @returns {{accessToken: string, refreshToken: string}}
 */
export const generateTokenPair = (user) => {
  const payload = buildAuthPayload(user);

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

// ====*** Token Alias Export ***=====

/**
 * Verify a bearer token for shared HTTP and socket auth.
 * @param {string} token
 * @returns {object}
 */
export const verifyToken = verifyAccessToken;

// ====*** Token Hash Helpers ***=====

/**
 * Create a deterministic token fingerprint for Redis storage.
 * @param {string} token
 * @returns {string}
 */
export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");
