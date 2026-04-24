/* Environment configuration with validation and centralized application settings */

import "dotenv/config";
import { z } from "zod";

/* Define schema for validating required environment variables */
const envSchema = z.object({
  /* Application environment configuration */
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  /* Application server port configuration */
  PORT: z.coerce.number().min(1000).max(9999).default(3000),

  /* MongoDB database connection string */
  MONGODB_URI: z.string().url("Invalid MongoDB URI"),

  /* Redis cache and session connection string */
  REDIS_URL: z.string().url("Invalid Redis URL"),

  /* JWT access token secret for authentication */
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, "Access token secret must be at least 32 characters"),

  /* JWT refresh token secret for long-term sessions */
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "Refresh token secret must be at least 32 characters"),

  /* Password hashing salt rounds for bcrypt security */
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(8).max(20).default(12),

  /* Twilio service credentials for OTP and messaging */
  TWILIO_ACCOUNT_SID: z.string().min(1, "Twilio Account SID is required"),
  TWILIO_AUTH_TOKEN: z.string().min(1, "Twilio Auth Token is required"),
  TWILIO_PHONE_NUMBER: z
    .string()
    .regex(/^\+\d{10,15}$/, "Invalid phone number format"),

  /* Cloudinary service credentials for media uploads */
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "Cloudinary Cloud Name is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "Cloudinary API Key is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "Cloudinary API Secret is required"),

  /* Frontend client application URL */
  CLIENT_URL: z.string().url("Invalid client URL"),
});

/* Store validated environment variables after schema parsing */
let validatedEnv;

try {
  /* Validate all environment variables against schema rules */
  validatedEnv = envSchema.parse(process.env);
} catch (error) {
  /* Handle invalid or missing environment variables gracefully */
  console.error(
    "Environment validation failed:",
    error.errors
      .map((err) => `${err.path.join(".")}: ${err.message}`)
      .join(", ")
  );

  /* Stop application startup if critical configuration is invalid */
  process.exit(1);
}

/* Export validated environment variables for application-wide usage */
export default validatedEnv;
