// services/auth.service.js
/** Feature: Comprehensive authentication business logic */
/** Feature: User management, token handling, and security operations */

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

class AuthService {
  async register(phone, countryCode, password, displayName, avatarFile) {
    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      throw new ApiError(409, "Phone number already registered");
    }

    let avatar = {};
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

    const user = new User({
      phone,
      countryCode,
      password,
      displayName,
      avatar,
    });

    await user.save();

    try {
      const otp = generateOtp();
      await storeOtp(phone, otp);
      await sendOtpSms(phone, otp);
    } catch {
      // Clean up user if OTP fails
      await User.findByIdAndDelete(user._id);
      throw new ApiError(500, "Failed to send verification OTP");
    }

    return {
      message:
        "Registration successful. Please verify your phone number with the OTP sent.",
    };
  }

  async verifyOtp(phone, otp) {
    const result = await verifyOtp(phone, otp);
    if (!result.success) {
      throw new ApiError(400, result.message);
    }

    const user = await User.findOne({ phone });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    user.isVerified = true;
    await user.save();

    const tokens = generateTokenPair(user);

    try {
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

  async login(phone, password) {
    const user = await User.findOne({ phone }).select(
      "+password +refreshTokenHash +loginAttempts +lockUntil"
    );

    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    // Check account lock
    if (user.isLocked) {
      throw new ApiError(
        423,
        "Account is temporarily locked due to too many failed attempts"
      );
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      throw new ApiError(401, "Invalid credentials");
    }

    if (!user.isVerified) {
      throw new ApiError(403, "Please verify your phone number first");
    }

    if (!user.isActive) {
      throw new ApiError(403, "Account has been deactivated");
    }

    // Reset login attempts on successful login
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

  async refreshToken(refreshToken) {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new ApiError(401, "Refresh token has been revoked");
      }

      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.id).select("+refreshTokenHash");

      if (
        !user ||
        !(await comparePassword(refreshToken, user.refreshTokenHash))
      ) {
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

  async logout(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.id).select("+refreshTokenHash");

      if (
        user &&
        (await comparePassword(refreshToken, user.refreshTokenHash))
      ) {
        user.refreshTokenHash = undefined;
        await user.save();
      }

      // Blacklist the token for 7 days
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

  async forgotPassword(phone) {
    const user = await User.findOne({ phone });
    if (!user) {
      // Don't reveal if user exists for security
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

  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return { user: user.toJSON() };
  }

  async updateProfile(userId, updates, avatarFile) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Update display name if provided
    if (updates.displayName) {
      user.displayName = updates.displayName;
    }

    // Update avatar if provided
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

    return { user: user.toJSON(), message: "Profile updated successfully" };
  }

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

    return { user: user.toJSON(), message: "Avatar updated successfully" };
  }

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
/* =====*** Auth service implemented ***==== */
/* =====* user *==== */
