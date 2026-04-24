/* Zod validation schemas for authentication endpoints with input sanitization */

import { z } from "zod";

/* Common validation patterns */
const phoneRegex = /^\+\d{10,15}$/;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

/* Phone number validation schema */
const phoneSchema = z
  .string({ required_error: "Phone number is required" })
  .regex(phoneRegex, "Invalid phone number format (e.g., +1234567890)")
  .transform((val) => val.toLowerCase().trim());

/* Strong password validation schema */
const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .regex(
    passwordRegex,
    "Password must contain uppercase, lowercase, number, and special character"
  );

/* Display name validation schema */
const displayNameSchema = z
  .string({ required_error: "Display name is required" })
  .min(2, "Display name must be at least 2 characters")
  .max(50, "Display name cannot exceed 50 characters")
  .trim();

/* OTP validation schema */
const otpSchema = z
  .string({ required_error: "OTP is required" })
  .length(6, "OTP must be exactly 6 digits")
  .regex(/^\d{6}$/, "OTP must contain only digits");

/* Avatar file validation schema */
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

/* Register endpoint validation */
export const registerSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    countryCode: z
      .string({ required_error: "Country code is required" })
      .min(2)
      .max(3)
      .toUpperCase()
      .trim(),
    password: passwordSchema,
    displayName: displayNameSchema,
  }),
  file: avatarFileSchema.optional(),
});

/* OTP verification validation */
export const verifyOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema,
  }),
});

/* Resend OTP validation */
export const resendOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
  }),
});

/* Login validation */
export const loginSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required"),
  }),
});

/* Refresh token validation */
export const refreshTokenSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({
      required_error: "Refresh token is required",
    }),
  }),
});

/* Logout validation */
export const logoutSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({
      required_error: "Refresh token is required",
    }),
  }),
});

/* Forgot password validation */
export const forgotPasswordSchema = z.object({
  body: z.object({
    phone: phoneSchema,
  }),
});

/* Reset password validation */
export const resetPasswordSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema,
    newPassword: passwordSchema,
  }),
});

/* Avatar update validation */
export const updateAvatarSchema = z.object({
  file: avatarFileSchema,
});

/* Profile update validation */
export const updateProfileSchema = z.object({
  body: z.object({
    displayName: displayNameSchema.optional(),
  }),
  file: avatarFileSchema.optional(),
});
