import { redis } from "../config/redis.config.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiResponse.util.js";
import {
  deleteAvatar,
  uploadAvatar,
  validateAvatarUpload,
} from "../utils/cloudinary.util.js";
import { comparePassword, hashPassword } from "../utils/hash.utils.js";
import {
  generateTokenPair,
  hashToken,
  verifyRefreshToken,
} from "../utils/jwt.utils.js";
import {
  canResendOtp,
  generateOtp,
  getOtpResendCooldown,
  sendOtpSms,
  setOtpResendCooldown,
  storeOtp,
  verifyOtp,
} from "../utils/otp.util.js";

// ====*** Auth Cookie TTL Constant ***=====

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const getRefreshTokenBlocklistKey = (token) =>
  `token_blocklist:${hashToken(token)}`;
const getAccessTokenBlocklistKey = (token) =>
  `token_blocklist:${hashToken(token)}`;

// ====*** Register User ***=====

export const register = async (
  phone,
  countryCode,
  password,
  displayName,
  avatarFile
) => {
  const existingUser = await User.findOne({ phone });

  if (existingUser) {
    throw ApiError.conflict("Phone number is already registered");
  }

  const user = new User({
    phone,
    countryCode,
    password,
    displayName,
  });

  if (avatarFile) {
    await validateAvatarUpload(avatarFile.buffer);
    const uploadResult = await uploadAvatar(
      avatarFile.buffer,
      `avatar_${phone.replace(/\W/g, "")}_${Date.now()}`
    );

    user.avatar = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };
  }

  let isUserSaved = false;

  try {
    await user.save();
    isUserSaved = true;

    const otp = generateOtp();
    await storeOtp(phone, otp);
    await sendOtpSms(phone, otp);
    await setOtpResendCooldown(phone);
  } catch (error) {
    if (user.avatar?.publicId) {
      await deleteAvatar(user.avatar.publicId).catch(() => {});
    }
    await User.findByIdAndDelete(user._id);

    if (error.message === "Twilio is not configured") {
      throw new ApiError(503, "OTP SMS service is not configured");
    }

    if (error instanceof ApiError) {
      throw error;
    }

    if (error?.name === "ValidationError") {
      const details = Object.values(error.errors || {}).map((err) => ({
        path: err.path,
        message: err.message,
      }));
      throw ApiError.badRequest("Registration validation failed", details);
    }

    if (error?.name === "MongoServerError" || error?.name === "MongoError") {
      throw new ApiError(503, "Database write failed during registration");
    }

    if (!isUserSaved) {
      throw new ApiError(500, "Failed to create account during registration");
    }

    throw new ApiError(502, "Failed to send verification OTP");
  }

  return {
    message:
      "Registration successful. Verify your phone number with the OTP sent.",
  };
};

// ====*** Verify User OTP ***=====

export const verifyUserOtp = async (phone, otp) => {
  const otpResult = await verifyOtp(phone, otp);

  if (!otpResult.success) {
    throw ApiError.badRequest(otpResult.message);
  }

  const user = await User.findOne({ phone });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  user.isVerified = true;

  const tokens = generateTokenPair(user);
  user.refreshTokenHash = await hashPassword(tokens.refreshToken);
  await user.save();

  return {
    message: "Phone number verified successfully",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: user.toJSON(),
  };
};

// ====*** Resend OTP ***=====

export const resendOtp = async (phone) => {
  const user = await User.findOne({ phone });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (user.isVerified) {
    throw ApiError.badRequest("Account is already verified");
  }

  if (!(await canResendOtp(phone))) {
    const retryAfterSeconds = await getOtpResendCooldown(phone);
    throw new ApiError(
      429,
      `OTP resend is on cooldown. Try again in ${retryAfterSeconds} seconds`
    );
  }

  const otp = generateOtp();
  await storeOtp(phone, otp);
  await sendOtpSms(phone, otp);
  await setOtpResendCooldown(phone);

  return {
    message: "OTP sent successfully",
  };
};

// ====*** Login User ***=====

export const login = async (phone, password) => {
  const user = await User.findOne({ phone }).select(
    "+password +refreshTokenHash +loginAttempts +lockUntil"
  );

  if (!user) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  if (user.isLocked) {
    throw ApiError.locked(
      "Account is temporarily locked because of too many failed login attempts"
    );
  }

  if (!user.isActive) {
    throw ApiError.forbidden("Account has been deactivated");
  }

  if (!user.isVerified) {
    throw ApiError.forbidden("Phone number verification is required");
  }

  const isValidPassword = await comparePassword(password, user.password);

  if (!isValidPassword) {
    await user.incLoginAttempts();
    throw ApiError.unauthorized("Invalid credentials");
  }

  await user.resetLoginAttempts();

  const tokens = generateTokenPair(user);
  user.refreshTokenHash = await hashPassword(tokens.refreshToken);
  user.lastSeen = new Date();
  await user.save();

  return {
    message: "Login successful",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: user.toJSON(),
  };
};

// ====*** Refresh Session ***=====

export const refreshToken = async (refreshTokenValue) => {
  const isBlacklisted = await redis.get(
    getRefreshTokenBlocklistKey(refreshTokenValue)
  );

  if (isBlacklisted) {
    throw ApiError.unauthorized("Refresh token has been revoked");
  }

  let decoded;

  try {
    decoded = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const user = await User.findById(decoded.id).select("+refreshTokenHash");

  if (!user?.refreshTokenHash) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const matches = await comparePassword(
    refreshTokenValue,
    user.refreshTokenHash
  );

  if (!matches) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const nextTokens = generateTokenPair(user);
  await redis.set(
    getRefreshTokenBlocklistKey(refreshTokenValue),
    "1",
    "EX",
    REFRESH_TOKEN_TTL_SECONDS
  );
  user.refreshTokenHash = await hashPassword(nextTokens.refreshToken);
  await user.save();

  return {
    message: "Token refreshed successfully",
    accessToken: nextTokens.accessToken,
    refreshToken: nextTokens.refreshToken,
  };
};

// ====*** Logout User ***=====

export const logout = async (refreshTokenValue, accessTokenValue = null) => {
  let decoded;

  try {
    decoded = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  const user = await User.findById(decoded.id).select("+refreshTokenHash");

  if (user) {
    user.refreshTokenHash = null;
    await user.save();
  }

  await redis.set(
    getRefreshTokenBlocklistKey(refreshTokenValue),
    "1",
    "EX",
    REFRESH_TOKEN_TTL_SECONDS
  );

  if (accessTokenValue) {
    await redis.set(
      getAccessTokenBlocklistKey(accessTokenValue),
      "1",
      "EX",
      ACCESS_TOKEN_TTL_SECONDS
    );
  }

  return {
    message: "Logged out successfully",
  };
};

// ====*** Forgot Password ***=====

export const forgotPassword = async (phone) => {
  const user = await User.findOne({ phone });

  if (!user) {
    return {
      message: "If the phone number exists, an OTP has been sent",
    };
  }

  const otp = generateOtp();
  await storeOtp(phone, otp);
  await sendOtpSms(phone, otp);
  await setOtpResendCooldown(phone);

  return {
    message: "If the phone number exists, an OTP has been sent",
  };
};

// ====*** Reset Password ***=====

export const resetPassword = async (phone, otp, newPassword) => {
  const otpResult = await verifyOtp(phone, otp);

  if (!otpResult.success) {
    throw ApiError.badRequest(otpResult.message);
  }

  const user = await User.findOne({ phone });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  user.password = newPassword;
  user.refreshTokenHash = null;
  user.sessionInvalidatedAt = new Date();
  await user.save();

  return {
    message: "Password reset successfully",
  };
};

// ====*** Get Profile ***=====

export const getProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return {
    user: user.toJSON(),
  };
};

// ====*** Update Profile ***=====

export const updateProfile = async (userId, updates, avatarFile) => {
  const user = await User.findById(userId);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (updates.displayName) {
    user.displayName = updates.displayName;
  }

  if (avatarFile) {
    await validateAvatarUpload(avatarFile.buffer);
    if (user.avatar?.publicId) {
      await deleteAvatar(user.avatar.publicId).catch(() => {});
    }

    const uploadResult = await uploadAvatar(
      avatarFile.buffer,
      `avatar_${user.phone.replace(/\W/g, "")}_${Date.now()}`
    );

    user.avatar = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };
  }

  await user.save();

  return {
    message: "Profile updated successfully",
    user: user.toJSON(),
  };
};

// ====*** Update Avatar ***=====

export const updateAvatar = async (userId, avatarFile) =>
  updateProfile(userId, {}, avatarFile);

// ====*** Deactivate Account ***=====

export const deactivateAccount = async (
  userId,
  accessTokenValue = null,
  refreshTokenValue = null
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  user.isActive = false;
  user.isOnline = false;
  user.refreshTokenHash = null;
  user.sessionInvalidatedAt = new Date();
  await user.save();

  if (refreshTokenValue) {
    await redis.set(
      getRefreshTokenBlocklistKey(refreshTokenValue),
      "1",
      "EX",
      REFRESH_TOKEN_TTL_SECONDS
    );
  }

  if (accessTokenValue) {
    await redis.set(
      getAccessTokenBlocklistKey(accessTokenValue),
      "1",
      "EX",
      ACCESS_TOKEN_TTL_SECONDS
    );
  }

  return {
    message: "Account deactivated successfully",
  };
};
