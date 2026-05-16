import bcrypt from "bcrypt";
import crypto from "crypto";
import twilio from "twilio";
import { redis } from "../config/redis.config.js";
import { env } from "../config/env.config.js";
import phoneUtil from "libphonenumber-js";

// ====*** OTP Constants ***=====

const OTP_TTL_SECONDS = 300;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = env.OTP_RESEND_COOLDOWN_SECONDS;

// ====*** Twilio Client ***=====

const twilioClient =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    : null;

// ====*** OTP Key Helpers ***=====

const getOtpKey = (phone) => `otp:${phone}`;
const getOtpAttemptsKey = (phone) => `otp_attempts:${phone}`;
const getOtpCooldownKey = (phone) => `otp_cooldown:${phone}`;

// ====*** Generate OTP ***=====

/**
 * Generate a 6 digit OTP.
 * @returns {string}
 */
export const generateOtp = () => {
  // Use fixed OTP in development for easy testing
  if (env.NODE_ENV === "development") {
    return "123456";
  }
  return crypto.randomInt(100000, 1000000).toString();
};

// ====*** Validate Phone Number ***=====

/**
 * Validate and format phone number to E.164 format.
 * @param {string} phone - Phone number with country code
 * @returns {string|null} - Formatted E.164 phone number or null if invalid
 */
export const validatePhoneNumber = (phone) => {
  try {
    const parsed = phoneUtil.parsePhoneNumberFromString(phone, undefined, {
      extended: true,
    });
    if (!parsed.isValid()) {
      return null;
    }
    return parsed.format("E.164");
  } catch (error) {
    return null;
  }
};

// ====*** Send OTP SMS ***=====

/**
 * Send an OTP via Twilio or log it in development.
 * @param {string} phone - E.164 formatted phone number
 * @param {string} otp - OTP code
 * @returns {Promise<void>}
 */
export const sendOtpSms = async (phone, otp) => {
  // Development mode: log OTP instead of sending
  if (env.NODE_ENV !== "production") {
    console.log(`[OTP DEV] OTP for ${phone}: ${otp}`);
    return;
  }

  // Production: send via Twilio
  if (!twilioClient || !env.TWILIO_PHONE_NUMBER) {
    throw new Error("Twilio is not configured");
  }

  // Validate phone number format (should already be E.164 from validatePhoneNumber)
  const e164Phone = validatePhoneNumber(phone);
  if (!e164Phone) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }

  // Retry mechanism for transient failures
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await twilioClient.messages.create({
        body: `Your WattsApp verification code is ${otp}. It expires in 5 minutes.`,
        from: env.TWILIO_PHONE_NUMBER,
        to: e164Phone,
      });
      return; // Success, exit the function
    } catch (error) {
      // Check if it's a retryable error (e.g., network issues, rate limiting)
      const isRetryable =
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNRESET" ||
        error.code === "ENOTFOUND" ||
        error.status === 429 || // Rate limited
        (error.status >= 500 && error.status < 600); // Server errors

      if (!isRetryable || attempt === maxRetries - 1) {
        // If not retryable or last attempt, throw the error
        console.error(
          `[OTP ERROR] Failed to send OTP after ${attempt + 1} attempts:`,
          error
        );
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// ====*** Store OTP ***=====

/**
 * Store a hashed OTP and reset attempts.
 * @param {string} phone - E.164 formatted phone number
 * @param {string} otp - OTP code
 * @returns {Promise<void>}
 */
export const storeOtp = async (phone, otp) => {
  const otpHash = await bcrypt.hash(otp, 10);

  await redis
    .multi()
    .set(getOtpKey(phone), otpHash, "EX", OTP_TTL_SECONDS)
    .set(getOtpAttemptsKey(phone), "0", "EX", OTP_TTL_SECONDS)
    .exec();
};

// ====*** OTP Resend Cooldown Helpers ***=====

/**
 * Determine whether an OTP resend is currently allowed.
 * @param {string} phone - E.164 formatted phone number
 * @returns {Promise<boolean>}
 */
export const canResendOtp = async (phone) => {
  const cooldown = await redis.ttl(getOtpCooldownKey(phone));
  return cooldown <= 0;
};

/**
 * Start the OTP resend cooldown timer.
 * @param {string} phone - E.164 formatted phone number
 * @returns {Promise<void>}
 */
export const setOtpResendCooldown = async (phone) => {
  await redis.set(
    getOtpCooldownKey(phone),
    "1",
    "EX",
    OTP_RESEND_COOLDOWN_SECONDS
  );
};

/**
 * Get remaining OTP resend cooldown time.
 * @param {string} phone - E.164 formatted phone number
 * @returns {Promise<number>}
 */
export const getOtpResendCooldown = async (phone) => {
  const cooldown = await redis.ttl(getOtpCooldownKey(phone));
  return cooldown > 0 ? cooldown : 0;
};

// ====*** Verify OTP ***=====

/**
 * Verify an OTP for a phone number.
 * @param {string} phone - E.164 formatted phone number
 * @param {string} otp - OTP code
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const verifyOtp = async (phone, otp) => {
  const [storedOtpHash, attemptsValue] = await Promise.all([
    redis.get(getOtpKey(phone)),
    redis.get(getOtpAttemptsKey(phone)),
  ]);

  if (!storedOtpHash) {
    return {
      success: false,
      message: "OTP expired or not found",
    };
  }

  const attempts = Number(attemptsValue || 0);

  if (attempts >= OTP_MAX_ATTEMPTS) {
    await redis.del(getOtpKey(phone), getOtpAttemptsKey(phone));

    return {
      success: false,
      message: "Too many OTP attempts. Request a new code.",
    };
  }

  const isValid = await bcrypt.compare(otp, storedOtpHash);

  if (!isValid) {
    const nextAttempts = await redis.incr(getOtpAttemptsKey(phone));
    await redis.expire(getOtpAttemptsKey(phone), OTP_TTL_SECONDS);

    return {
      success: false,
      message: `Invalid OTP. ${Math.max(OTP_MAX_ATTEMPTS - nextAttempts, 0)} attempts remaining.`,
    };
  }

  await redis.del(getOtpKey(phone), getOtpAttemptsKey(phone));

  return {
    success: true,
    message: "OTP verified successfully",
  };
};
