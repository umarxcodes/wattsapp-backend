/* Authentication service handling business logic for user authentication system */

import User from "../models/user.model.js";
import { hashPassword, comparePassword } from "../utils/hash.utils.js";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt.utils.js";
import {
  generateOtp,
  sendOtpSms,
  storeOtp,
  verifyOtp,
} from "../utils/otp.util.js";
import { uploadAvatar, deleteAvatar } from "../utils/cloudinary.util.js";
import redis from "../config/redis.config.js";
import { ApiError } from "../utils/ApiResponse.util.js";

/* Service layer responsible for authentication-related operations */
class AuthService {
  /* Register new user and initiate OTP verification */
  async register(phone, countryCode, password, displayName, avatarFile) {
    /* Check if user already exists */
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      throw new ApiError(409, "Phone number already registered");
    }

    let avatar = {};

    /* Handle optional avatar upload during registration */
    if (avatarFile) {
      try {
        const publicId = `avatar_${phone}_${Date.now()}`;
        const uploadResult = await uploadAvatar(avatarFile.buffer, publicId);

        avatar = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        };
      } catch {
        throw new ApiError(500, "Failed to upload avatar");
      }
    }

    /* Create new user document */
    const user = new User({
      phone,
      countryCode,
      password,
      displayName,
      avatar,
    });

    await user.save();

    /* Generate and send OTP for verification */
    try {
      const otp = generateOtp();
      await storeOtp(phone, otp);
      await sendOtpSms(phone, otp);
    } catch {
      /* Rollback user creation if OTP process fails */
      await User.findByIdAndDelete(user._id);
      throw new ApiError(500, "Failed to send verification OTP");
    }

    return {
      message:
        "Registration successful. Please verify your phone number with the OTP sent.",
    };
  }

  /* Verify OTP and activate user account */
  async verifyOtp(phone, otp) {
    const result = await verifyOtp(phone, otp);

    if (!result.success) {
      throw new ApiError(400, result.message);
    }

    const user = await User.findOne({ phone });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    /* Mark user as verified */
    user.isVerified = true;
    await user.save();

    /* Generate authentication tokens */
    const tokens = generateTokenPair(user);

    try {
      /* Store hashed refresh token for security */
      user.refreshTokenHash = await hashPassword(tokens.refreshToken);
      await user.save();
    } catch {
      throw new ApiError(500, "Failed to secure session");
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toJSON(),
      message: "Phone number verified successfully",
    };
  }

  /* Resend OTP for account verification */
  async resendOtp(phone) {
    const user = await User.findOne({ phone });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
      throw new ApiError(400, "Account already verified");
    }

    try {
      const otp = generateOtp();
      await storeOtp(phone, otp);
      await sendOtpSms(phone, otp);
    } catch {
      throw new ApiError(500, "Failed to send OTP");
    }

    return { message: "OTP sent successfully" };
  }

  /* Authenticate user and generate session tokens */
  async login(phone, password) {
    const user = await User.findOne({ phone }).select(
      "+password +refreshTokenHash +loginAttempts +lockUntil"
    );

    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    /* Check if account is locked */
    if (user.isLocked) {
      throw new ApiError(
        423,
        "Account is temporarily locked due to too many failed attempts"
      );
    }

    /* Validate password */
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      await user.incLoginAttempts();
      throw new ApiError(401, "Invalid credentials");
    }

    /* Ensure account is verified */
    if (!user.isVerified) {
      throw new ApiError(403, "Please verify your phone number first");
    }

    /* Ensure account is active */
    if (!user.isActive) {
      throw new ApiError(403, "Account has been deactivated");
    }

    /* Reset login attempts after successful login */
    await user.resetLoginAttempts();

    const tokens = generateTokenPair(user);

    try {
      user.refreshTokenHash = await hashPassword(tokens.refreshToken);
      user.lastSeen = new Date();
      await user.save();
    } catch {
      throw new ApiError(500, "Failed to create session");
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: user.toJSON(),
      message: "Login successful",
    };
  }

  /* Refresh access token using refresh token */
  async refreshToken(refreshToken) {
    try {
      const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new ApiError(401, "Refresh token has been revoked");
      }

      const decoded = verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.id).select("+refreshTokenHash");

      if (!user || !user.refreshTokenHash) {
        throw new ApiError(401, "Invalid refresh token");
      }

      const isValid = await comparePassword(
        refreshToken,
        user.refreshTokenHash
      );

      if (!isValid) {
        throw new ApiError(401, "Invalid refresh token");
      }

      const tokens = generateTokenPair(user);

      user.refreshTokenHash = await hashPassword(tokens.refreshToken);
      await user.save();

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        message: "Token refreshed successfully",
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, "Invalid refresh token");
    }
  }

  /* Logout user and invalidate session */
  async logout(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      const user = await User.findById(decoded.id).select("+refreshTokenHash");

      if (user && user.refreshTokenHash) {
        const isValid = await comparePassword(
          refreshToken,
          user.refreshTokenHash
        );

        if (isValid) {
          user.refreshTokenHash = undefined;
          await user.save();
        }
      }

      /* Add token to blacklist */
      await redis.set(
        `blacklist:${refreshToken}`,
        "true",
        "EX",
        7 * 24 * 60 * 60
      );

      return { message: "Logged out successfully" };
    } catch {
      throw new ApiError(401, "Invalid token");
    }
  }

  /* Handle forgot password request securely */
  async forgotPassword(phone) {
    const user = await User.findOne({ phone });

    /* Do not reveal user existence for security reasons */
    if (!user) {
      return {
        message: "If the phone number is registered, an OTP has been sent",
      };
    }

    try {
      const otp = generateOtp();
      await storeOtp(phone, otp);
      await sendOtpSms(phone, otp);
    } catch {
      throw new ApiError(500, "Failed to send OTP");
    }

    return {
      message: "If the phone number is registered, an OTP has been sent",
    };
  }

  /* Reset user password after OTP verification */
  async resetPassword(phone, otp, newPassword) {
    const result = await verifyOtp(phone, otp);

    if (!result.success) {
      throw new ApiError(400, result.message);
    }

    const user = await User.findOne({ phone });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    return { message: "Password reset successfully" };
  }

  /* Retrieve user profile */
  async getProfile(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return { user: user.toJSON() };
  }

  /* Update user profile details and avatar */
  async updateProfile(userId, updates, avatarFile) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    /* Update display name */
    if (updates.displayName) {
      user.displayName = updates.displayName;
    }

    /* Update avatar if provided */
    if (avatarFile) {
      try {
        if (user.avatar.publicId) {
          await deleteAvatar(user.avatar.publicId);
        }

        const publicId = `avatar_${user.phone}_${Date.now()}`;
        const uploadResult = await uploadAvatar(avatarFile.buffer, publicId);

        user.avatar = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
        };
      } catch {
        throw new ApiError(500, "Failed to update avatar");
      }
    }

    await user.save();

    return {
      user: user.toJSON(),
      message: "Profile updated successfully",
    };
  }

  /* Update only user avatar */
  async updateAvatar(userId, avatarFile) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    try {
      if (user.avatar.publicId) {
        await deleteAvatar(user.avatar.publicId);
      }

      const publicId = `avatar_${user.phone}_${Date.now()}`;
      const uploadResult = await uploadAvatar(avatarFile.buffer, publicId);

      user.avatar = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      };

      await user.save();
    } catch {
      throw new ApiError(500, "Failed to update avatar");
    }

    return {
      user: user.toJSON(),
      message: "Avatar updated successfully",
    };
  }

  /* Deactivate user account */
  async deactivateAccount(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    user.isActive = false;
    await user.save();

    return { message: "Account deactivated successfully" };
  }
}

export default new AuthService();
