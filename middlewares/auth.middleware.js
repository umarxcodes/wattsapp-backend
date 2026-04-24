// middlewares/auth.middleware.js
/** Feature: JWT token verification and role-based access control */
/** Feature: Token blacklisting and user validation */

import { verifyAccessToken as verifyToken } from "../utils/jwt.utils.js";
import redis from "../config/redis.config.js";
import { ApiError } from "../utils/ApiResponse.util.js";
import User from "../models/user.model.js";

/**
 * Middleware to verify access token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Access token required");
    }

    const token = authHeader.split(" ")[1];

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new ApiError(401, "Token has been revoked");
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    if (!user.isActive) {
      throw new ApiError(401, "Account has been deactivated");
    }

    req.user = {
      id: user._id.toString(),
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware - doesn't throw error if no token
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return next();
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = {
        id: user._id.toString(),
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
      };
    }

    next();
  } catch {
    // Don't throw error for optional auth
    next();
  }
};

/**
 * Factory function to require specific roles
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {function} Middleware function
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required roles: ${allowedRoles.join(", ")}`
      );
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole(["admin"]);

/**
 * Middleware to require verified user
 */
export const requireVerified = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (!req.user.isVerified) {
    throw new ApiError(403, "Phone number verification required");
  }

  next();
};

/* =====*** Auth middlewares implemented ***==== */

/**
 * Middleware to validate request using Zod schema
 * @param {z.ZodSchema} schema - The Zod schema
 * @returns {function} Middleware function
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync(req);
    next();
  } catch (error) {
    const message = error.errors.map((err) => err.message).join(", ");
    next(new ApiError(400, message));
  }
};
/* =====* user *==== */
