import { z } from "zod";

// ====*** Shared Auth Validation Schemas ***=====

const phoneSchema = z
  .string({ required_error: "Phone number is required" })
  .trim()
  .regex(/^\+\d{10,15}$/, "Phone number must be in E.164 format");

const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters");

const displayNameSchema = z
  .string({ required_error: "Display name is required" })
  .trim()
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name cannot exceed 50 characters");

const otpSchema = z
  .string({ required_error: "OTP is required" })
  .regex(/^\d{6}$/, "OTP must be a 6 digit code");

const avatarFileSchema = z.object({
  buffer: z.instanceof(Buffer),
  mimetype: z.string().min(1),
  size: z.number().max(5 * 1024 * 1024, "Avatar size must not exceed 5MB"),
});

// ====*** Register Validation ***=====

export const registerSchema = {
  body: z.object({
    phone: phoneSchema,
    countryCode: z.string().trim().min(2).max(5).toUpperCase(),
    password: passwordSchema,
    displayName: displayNameSchema,
  }),
  file: avatarFileSchema.optional(),
};

// ====*** OTP Validation ***=====

export const verifyOtpSchema = {
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema,
  }),
};

export const resendOtpSchema = {
  body: z.object({
    phone: phoneSchema,
  }),
};

// ====*** Session Validation ***=====

export const loginSchema = {
  body: z.object({
    phone: phoneSchema,
    password: z.string().min(1, "Password is required"),
  }),
};

export const refreshTokenSchema = {
  cookies: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
};

export const logoutSchema = refreshTokenSchema;

// ====*** Password Recovery Validation ***=====

export const forgotPasswordSchema = {
  body: z.object({
    phone: phoneSchema,
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema,
    newPassword: passwordSchema,
  }),
};

// ====*** Profile Validation ***=====

export const updateProfileSchema = {
  body: z.object({
    displayName: displayNameSchema.optional(),
  }),
  file: avatarFileSchema.optional(),
};

export const updateAvatarSchema = {
  file: avatarFileSchema,
};
