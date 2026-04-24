/* OTP generation, storage, verification, and SMS delivery service */

import crypto from "crypto";
import bcrypt from "bcrypt";
import twilio from "twilio";
import env from "../config/env.config.js";
import redis from "../config/redis.config.js";

/* Twilio client initialization for SMS delivery */
const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

/* OTP configuration constants */
const OTP_TTL = 300; // 5 minutes expiration
const OTP_MAX_ATTEMPTS = 5;

/* Generate secure 6-digit OTP */
export const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/* Send OTP via SMS using Twilio service */
export const sendOtpSms = async (phone, otp) => {
  /* Validate phone input */
  if (!phone || typeof phone !== "string") {
    throw new Error("Valid phone number is required");
  }

  /* Validate OTP format */
  if (!otp || typeof otp !== "string" || otp.length !== 6) {
    throw new Error("Valid 6-digit OTP is required");
  }

  try {
    /* Development mode: log OTP instead of sending SMS */
    if (env.NODE_ENV === "development") {
      console.log(`OTP (DEV) for ${phone}: ${otp}`);
      return;
    }

    /* Send SMS via Twilio */
    await twilioClient.messages.create({
      body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
      from: env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`OTP sent successfully to ${phone}`);
  } catch (error) {
    console.error("Failed to send OTP SMS:", error.message);
    throw new Error("Failed to send OTP via SMS", { cause: error });
  }
};

/* Store hashed OTP in Redis with expiration and attempt tracking */
export const storeOtp = async (phone, otp) => {
  if (!phone || !otp) {
    throw new Error("Phone and OTP are required");
  }

  const otpKey = `otp:${phone}`;
  const attemptsKey = `otp_attempts:${phone}`;

  try {
    /* Hash OTP before storing for security */
    const hashedOtp = await bcrypt.hash(otp, 10);

    /* Store OTP and attempt counter in Redis with TTL */
    await redis
      .multi()
      .set(otpKey, hashedOtp, "EX", OTP_TTL)
      .set(attemptsKey, 0, "EX", OTP_TTL)
      .exec();

    console.log(`OTP stored successfully for ${phone}`);
  } catch (error) {
    console.error("Failed to store OTP:", error.message);
    throw new Error("Failed to store OTP", { cause: error });
  }
};

/* Verify OTP with attempt limiting and security checks */
export const verifyOtp = async (phone, otp) => {
  if (!phone || !otp) {
    return {
      success: false,
      message: "Phone and OTP are required",
    };
  }

  const otpKey = `otp:${phone}`;
  const attemptsKey = `otp_attempts:${phone}`;

  try {
    /* Retrieve stored OTP and attempt count */
    const [storedOtp, attempts] = await Promise.all([
      redis.get(otpKey),
      redis.get(attemptsKey),
    ]);

    /* Check if OTP exists or expired */
    if (!storedOtp) {
      return {
        success: false,
        message: "OTP expired or not found",
      };
    }

    const attemptCount = Number(attempts) || 0;

    /* Block verification after maximum attempts */
    if (attemptCount >= OTP_MAX_ATTEMPTS) {
      await redis.del(otpKey);
      await redis.del(attemptsKey);

      return {
        success: false,
        message: "Too many attempts. OTP blocked.",
      };
    }

    /* Validate OTP */
    const isValid = await bcrypt.compare(otp, storedOtp);

    if (!isValid) {
      await redis.incr(attemptsKey);

      const remainingAttempts = OTP_MAX_ATTEMPTS - (attemptCount + 1);

      return {
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      };
    }

    /* Successful verification → cleanup Redis keys */
    await redis.del(otpKey);
    await redis.del(attemptsKey);

    return {
      success: true,
      message: "OTP verified successfully",
    };
  } catch (error) {
    console.error("OTP verification error:", error.message);

    return {
      success: false,
      message: "Verification failed",
    };
  }
};
