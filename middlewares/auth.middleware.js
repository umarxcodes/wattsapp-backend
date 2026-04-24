/* Authentication and authorization middleware configuration */

import { verifyAccessToken as verifyToken } from "../utils/jwt.utils.js";
import redis from "../config/redis.config.js";
import { ApiError } from "../utils/ApiResponse.util.js";
import User from "../models/user.model.js";
import env from "../config/env.config.js";

/* Verify access token and attach authenticated user to request */
export const authenticate = async (req, res, next) => {
  try {
    /* Extract authorization header from request */
    const authHeader = req.headers.authorization;

    /* Validate bearer token existence */
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Access token required");
    }

    /* Extract JWT token from authorization header */
    const token = authHeader.split(" ")[1];

    /* Check whether token exists in Redis blacklist */
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new ApiError(401, "Token has been revoked");
    }

    /* Verify and decode access token */
    const decoded = verifyToken(token);

    /* Fetch authenticated user from database */
    const user = await User.findById(decoded.id);

    /* Validate user existence */
    if (!user) {
      throw new ApiError(401, "User not found");
    }

    /* Prevent access for deactivated accounts */
    if (!user.isActive) {
      throw new ApiError(401, "Account has been deactivated");
    }

    /* Attach safe user data to request object */
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

/* Optional authentication without throwing error for missing token */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    /* Extract authorization header if available */
    const authHeader = req.headers.authorization;

    /* Continue request if no token is provided */
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    /* Extract JWT token */
    const token = authHeader.split(" ")[1];

    /* Skip authentication for blacklisted tokens */
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return next();
    }

    /* Verify and decode token */
    const decoded = verifyToken(token);

    /* Fetch user from database */
    const user = await User.findById(decoded.id);

    /* Attach user only if account is valid and active */
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
    /* Ignore authentication failure for optional access */
    next();
  }
};

/* Create middleware for restricting access by user roles */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    /* Ensure user is authenticated before role validation */
    if (!req.user) {
      throw new ApiError(401, "Authentication required");
    }

    /* Validate user role against allowed roles */
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Required roles: ${allowedRoles.join(", ")}`
      );
    }

    next();
  };
};

/* Restrict access to admin users only */
export const requireAdmin = requireRole(["admin"]);

/* Restrict access to verified users only */
export const requireVerified = (req, res, next) => {
  /* Ensure authentication exists */
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  /* Ensure user has completed phone verification */
  if (!req.user.isVerified) {
    throw new ApiError(403, "Phone number verification required");
  }

  next();
};

/* Validate incoming request using provided Zod schema */
export const validate = (schema) => async (req, res, next) => {
  try {
    /* Validate request body, params, and query */
    await schema.parseAsync(req);

    next();
  } catch (error) {
    /* Format validation errors into a readable message */
    const message = error.errors.map((err) => err.message).join(", ");

    next(new ApiError(400, message));
  }
};
