// utils/otp.util.js
/** Feature: OTP generation, storage, verification, and SMS sending */
/** Feature: Secure OTP handling with attempt limiting and expiration */

import crypto from "crypto";
import bcrypt from "bcrypt";
import twilio from "twilio";
import env from "../config/env.config.js";
import redis from "../config/redis.config.js";

const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

const OTP_TTL = 300; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;

/**
 * Generate a secure 6-digit OTP
 * @returns {string} The generated OTP
 */
export const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Send OTP via SMS using Twilio
 * @param {string} phone - The phone number to send OTP to
 * @param {string} otp - The OTP to send
 * @throws {Error} If SMS sending fails
 */
export const sendOtpSms = async (phone, otp) => {
  if (!phone || typeof phone !== "string") {
    throw new Error("Valid phone number is required");
  }

  if (!otp || typeof otp !== "string" || otp.length !== 6) {
    throw new Error("Valid 6-digit OTP is required");
  }

  try {
    if (env.NODE_ENV === "development") {
      console.log(`📱 [DEV OTP] ${phone}: ${otp}`);
      return;
    }

    await twilioClient.messages.create({
      body: `Your WhatsApp verification code is: ${otp}. Valid for 5 minutes.`,
      from: env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`✅ OTP sent to ${phone}`);
  } catch (error) {
    console.error("❌ Failed to send OTP:", error.message);
    throw new Error("Failed to send OTP via SMS", { cause: error });
  }
};

/**
 * Store hashed OTP in Redis with TTL and attempt counter
 * @param {string} phone - The phone number
 * @param {string} otp - The OTP to store
 * @throws {Error} If storage fails
 */
export const storeOtp = async (phone, otp) => {
  if (!phone || !otp) {
    throw new Error("Phone and OTP are required");
  }

  const otpKey = `otp:${phone}`;
  const attemptsKey = `otp_attempts:${phone}`;

  try {
    const hashedOtp = await bcrypt.hash(otp, 10);

    await redis
      .multi()
      .set(otpKey, hashedOtp, "EX", OTP_TTL)
      .set(attemptsKey, 0, "EX", OTP_TTL)
      .exec();

    console.log(`✅ OTP stored for ${phone}`);
  } catch (error) {
    console.error("❌ Failed to store OTP:", error.message);
    throw new Error("Failed to store OTP", { cause: error });
  }
};

/**
 * Verify OTP with attempt limiting
 * @param {string} phone - The phone number
 * @param {string} otp - The OTP to verify
 * @returns {Promise<{success: boolean, message: string}>} Verification result
 */
export const verifyOtp = async (phone, otp) => {
  if (!phone || !otp) {
    return { success: false, message: "Phone and OTP are required" };
  }

  const otpKey = `otp:${phone}`;
  const attemptsKey = `otp_attempts:${phone}`;

  try {
    const [storedOtp, attempts] = await Promise.all([
      redis.get(otpKey),
      redis.get(attemptsKey),
    ]);

    if (!storedOtp) {
      return { success: false, message: "OTP expired or not found" };
    }

    const attemptCount = Number(attempts) || 0;

    if (attemptCount >= OTP_MAX_ATTEMPTS) {
      await redis.del(otpKey);
      await redis.del(attemptsKey);
      return { success: false, message: "Too many attempts. OTP blocked." };
    }

    const isValid = await bcrypt.compare(otp, storedOtp);

    if (!isValid) {
      await redis.incr(attemptsKey);
      const remainingAttempts = OTP_MAX_ATTEMPTS - (attemptCount + 1);
      return {
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      };
    }

    // Success → cleanup
    await redis.del(otpKey);
    await redis.del(attemptsKey);

    return { success: true, message: "OTP verified successfully" };
  } catch (error) {
    console.error("❌ OTP verification error:", error.message);
    return { success: false, message: "Verification failed" };
  }
};

/* =====*** OTP utilities implemented ***==== */
