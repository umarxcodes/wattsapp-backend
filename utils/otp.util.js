import bcrypt from "bcrypt";
import crypto from "crypto";
import twilio from "twilio";
import { redis } from "../config/redis.config.js";
import { env } from "../config/env.config.js";

// ====*** OTP Constants ***=====

const OTP_TTL_SECONDS = 300;
const OTP_MAX_ATTEMPTS = 5;

// ====*** Twilio Client ***=====

const twilioClient =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    : null;

// ====*** OTP Key Helpers ***=====

const getOtpKey = (phone) => `otp:${phone}`;
const getOtpAttemptsKey = (phone) => `otp_attempts:${phone}`;

// ====*** Generate OTP ***=====

/**
 * Generate a 6 digit OTP.
 * @returns {string}
 */
export const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

// ====*** Send OTP SMS ***=====

/**
 * Send an OTP via Twilio or log it in development.
 * @param {string} phone
 * @param {string} otp
 * @returns {Promise<void>}
 */
export const sendOtpSms = async (phone, otp) => {
  if (env.NODE_ENV !== "production") {
    console.log(`OTP for ${phone}: ${otp}`);
    return;
  }

  if (!twilioClient || !env.TWILIO_PHONE_NUMBER) {
    throw new Error("Twilio is not configured");
  }

  await twilioClient.messages.create({
    body: `Your WattsApp verification code is ${otp}. It expires in 5 minutes.`,
    from: env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
};

// ====*** Store OTP ***=====

/**
 * Store a hashed OTP and reset attempts.
 * @param {string} phone
 * @param {string} otp
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

// ====*** Verify OTP ***=====

/**
 * Verify an OTP for a phone number.
 * @param {string} phone
 * @param {string} otp
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
