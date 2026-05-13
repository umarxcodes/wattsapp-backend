import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ====*** Environment Variables Schema ***=====

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  REDIS_KEY_PREFIX: z.string().min(1).default("wattsapp"),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(32, "ACCESS_TOKEN_SECRET must be at least 32 characters"),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(12).max(15).default(12),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(30).default(60),
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_PHONE_NUMBER: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  CLIENT_URL: z.string().url("CLIENT_URL must be a valid URL"),
  CORS_ORIGINS: z.string().optional().default(""),
  SOCKET_CORS_ORIGIN: z
    .string()
    .url("SOCKET_CORS_ORIGIN must be a valid URL")
    .optional(),
});

// ====*** Environment Validation ***=====

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  throw new Error(`Environment validation failed: ${issues}`);
}

// ====*** Environment Export ***=====

const defaultLocalOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOrigins = [
  parsedEnv.data.CLIENT_URL,
  parsedEnv.data.SOCKET_CORS_ORIGIN,
  ...parsedEnv.data.CORS_ORIGINS.split(","),
  ...defaultLocalOrigins,
]
  .filter(Boolean)
  .map((origin) => origin.trim().replace(/\/$/, ""));

export const env = {
  ...parsedEnv.data,
  CORS_ORIGINS: [...new Set(corsOrigins)],
  SOCKET_CORS_ORIGIN:
    parsedEnv.data.SOCKET_CORS_ORIGIN || parsedEnv.data.CLIENT_URL,
};
