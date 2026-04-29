import { redis } from "../config/redis.config.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiResponse.util.js";
import { hashToken, verifyAccessToken } from "../utils/jwt.utils.js";

// ====*** Token Blocklist Helper ***=====

const getAccessTokenBlocklistKey = (token) =>
  `token_blocklist:${hashToken(token)}`;

// ====*** HTTP Authentication Middleware ***=====

export const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Access token is required");
    }

    const token = authorization.slice(7);
    const isBlacklisted = await redis.get(getAccessTokenBlocklistKey(token));

    if (isBlacklisted) {
      throw ApiError.unauthorized("Token has been revoked");
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id)
      .select("+sessionInvalidatedAt")
      .lean();

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("User is not authorized");
    }

    if (
      user.sessionInvalidatedAt &&
      decoded.iat * 1000 < new Date(user.sessionInvalidatedAt).getTime()
    ) {
      throw ApiError.unauthorized("Session is no longer valid");
    }

    req.user = {
      id: user._id.toString(),
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      isVerified: user.isVerified,
    };

    next();
  } catch (error) {
    next(error);
  }
};

// ====*** Optional Authentication Middleware ***=====

export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authorization.slice(7);
    const isBlacklisted = await redis.get(getAccessTokenBlocklistKey(token));

    if (isBlacklisted) {
      next();
      return;
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id)
      .select("+sessionInvalidatedAt")
      .lean();

    if (
      user?.isActive &&
      (!user.sessionInvalidatedAt ||
        decoded.iat * 1000 >= new Date(user.sessionInvalidatedAt).getTime())
    ) {
      req.user = {
        id: user._id.toString(),
        phone: user.phone,
        displayName: user.displayName,
        role: user.role,
        isVerified: user.isVerified,
      };
    }

    next();
  } catch {
    next();
  }
};

// ====*** Role Authorization Middleware ***=====

export const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    next(ApiError.unauthorized("Authentication required"));
    return;
  }

  if (!roles.includes(req.user.role)) {
    next(
      ApiError.forbidden("You do not have permission to access this resource")
    );
    return;
  }

  next();
};

export const requireAdmin = requireRole(["admin"]);

// ====*** Verified User Middleware ***=====

export const requireVerified = (req, res, next) => {
  if (!req.user) {
    next(ApiError.unauthorized("Authentication required"));
    return;
  }

  if (!req.user.isVerified) {
    next(ApiError.forbidden("Phone verification is required"));
    return;
  }

  next();
};
