// validation/auth.validator.js
/** Feature: Comprehensive Zod validation schemas for all auth endpoints */
/** Feature: Input sanitization and security validation */

import { z } from "zod";

// Common validation patterns
const phoneRegex = /^\+\d{10,15}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

const phoneSchema = z
  .string({ required_error: "Phone number is required" })
  .regex(phoneRegex, "Invalid phone number format (e.g., +1234567890)")
  .transform((val) => val.toLowerCase().trim());

const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .regex(
    passwordRegex,
    "Password must contain uppercase, lowercase, number, and special character"
  );

const displayNameSchema = z
  .string({ required_error: "Display name is required" })
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name cannot exceed 50 characters")
  .trim();

const otpSchema = z
  .string({ required_error: "OTP is required" })
  .length(6, "OTP must be exactly 6 digits")
  .regex(/^\d{6}$/, "OTP must contain only digits");

const avatarFileSchema = z.object({
  buffer: z.instanceof(Buffer, "Invalid file buffer"),
  mimetype: z
    .string()
    .refine(
      (val) => ["image/jpeg", "image/png", "image/webp"].includes(val),
      "Only JPEG, PNG, and WebP images are allowed"
    ),
  size: z.number().max(5 * 1024 * 1024, "File size must not exceed 5MB"),
});

export const registerSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    countryCode: z
      .string({ required_error: "Country code is required" })
      .min(2, "Country code must be at least 2 characters")
      .max(3, "Country code cannot exceed 3 characters")
      .toUpperCase()
      .trim(),
    password: passwordSchema,
    displayName: displayNameSchema,
  }),
  file: avatarFileSchema.optional(),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema,
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required"),
  }),
});

export const refreshTokenSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({ required_error: "Refresh token is required" }),
  }),
});

export const logoutSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({ required_error: "Refresh token is required" }),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    phone: phoneSchema,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema,
    newPassword: passwordSchema,
  }),
});

export const updateAvatarSchema = z.object({
  file: avatarFileSchema,
});

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: displayNameSchema.optional(),
  }),
  file: avatarFileSchema.optional(),
});

/* =====*** Auth validation schemas implemented ***==== */
