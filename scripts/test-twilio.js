import { env } from "./config/env.config.js";
import { generateOtp, sendOtpSms } from "./utils/otp.util.js";

async function testTwilio() {
  console.log("Testing Twilio configuration...");
  console.log("NODE_ENV:", env.NODE_ENV);
  console.log(
    "TWILIO_ACCOUNT_SID:",
    env.TWILIO_ACCOUNT_SID ? "SET" : "NOT SET"
  );
  console.log("TWILIO_AUTH_TOKEN:", env.TWILIO_AUTH_TOKEN ? "SET" : "NOT SET");
  console.log(
    "TWILIO_PHONE_NUMBER:",
    env.TWILIO_PHONE_NUMBER ? "SET" : "NOT SET"
  );

  if (env.NODE_ENV === "production") {
    if (
      !env.TWILIO_ACCOUNT_SID ||
      !env.TWILIO_AUTH_TOKEN ||
      !env.TWILIO_PHONE_NUMBER
    ) {
      console.error(
        "ERROR: Twilio credentials are not properly configured for production"
      );
      return false;
    }

    // Test phone number
    const testPhone = "+15551234567"; // Replace with a real number you own for testing
    const testOtp = "123456";

    try {
      console.log(`Attempting to send OTP ${testOtp} to ${testPhone}...`);
      await sendOtpSms(testPhone, testOtp);
      console.log("SUCCESS: OTP sent via Twilio");
      return true;
    } catch (error) {
      console.error("ERROR: Failed to send OTP via Twilio:", error.message);
      if (error.code) {
        console.error("Twilio error code:", error.code);
      }
      if (error.status) {
        console.error("HTTP status code:", error.status);
      }
      return false;
    }
  } else {
    console.log("Development mode: OTP would be logged instead of sent");
    const testPhone = "+15551234567";
    const testOtp = generateOtp();
    console.log(`[DEV MODE] OTP for ${testPhone}: ${testOtp}`);
    return true;
  }
}

testTwilio()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Unexpected error during test:", error);
    process.exit(1);
  });
