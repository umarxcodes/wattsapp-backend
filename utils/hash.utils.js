/* Password hashing and comparison utilities using bcrypt */

import bcrypt from "bcrypt";
import env from "../config/env.config.js";

/* Number of salt rounds used for password hashing */
const SALT_ROUNDS = env.BCRYPT_SALT_ROUNDS;

/* Hash a plain text password securely using bcrypt */
export const hashPassword = async (password) => {
  /* Validate input password */
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new Error("Password must be a string with at least 6 characters");
  }

  try {
    /* Generate bcrypt hash */
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    /* Wrap and rethrow hashing failure */
    throw new Error("Failed to hash password", { cause: error });
  }
};

/* Compare plain text password with hashed password */
export const comparePassword = async (password, hashedPassword) => {
  /* Validate plain password input */
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a valid string");
  }

  /* Validate hashed password input */
  if (!hashedPassword || typeof hashedPassword !== "string") {
    throw new Error("Hashed password must be a valid string");
  }

  try {
    /* Compare password using bcrypt */
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    /* Wrap and rethrow comparison failure */
    throw new Error("Failed to compare passwords", { cause: error });
  }
};

/* Validate whether a string is a valid bcrypt hash */
export const isBcryptHash = (hash) => {
  if (typeof hash !== "string") return false;

  return (
    hash.startsWith("$2a$") ||
    hash.startsWith("$2b$") ||
    hash.startsWith("$2y$")
  );
};
