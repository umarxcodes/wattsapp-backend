// config/env.config.js
/** Feature: Environment variable validation using Zod schema */
/** Feature: Centralized configuration management with type safety */
/** Feature: Graceful error handling for missing or invalid env vars */

import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().min(1000).max(9999).default(3000),
  MONGODB_URI: z.string().url("Invalid MongoDB URI"),
  REDIS_URL: z.string().url("Invalid Redis URL"),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, "Access token secret must be at least 32 characters"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "Refresh token secret must be at least 32 characters"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(8).max(20).default(12),
  TWILIO_ACCOUNT_SID: z.string().min(1, "Twilio Account SID is required"),
  TWILIO_AUTH_TOKEN: z.string().min(1, "Twilio Auth Token is required"),
  TWILIO_PHONE_NUMBER: z
    .string()
    .regex(/^\+\d{10,15}$/, "Invalid phone number format"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "Cloudinary Cloud Name is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "Cloudinary API Key is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "Cloudinary API Secret is required"),
  CLIENT_URL: z.string().url("Invalid client URL"),
});

let validatedEnv;

try {
  validatedEnv = envSchema.parse(process.env);
} catch (error) {
  console.error(
    "❌ Environment validation failed:",
    error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ")
  );
  process.exit(1);
}

export default validatedEnv;
/* =====*** Environment configuration validated ***==== */
