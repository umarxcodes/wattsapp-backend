// utils/hash.utils.js
/** Feature: Password hashing and comparison utilities using bcrypt */
/** Feature: Input validation and secure password handling */

import bcrypt from "bcrypt";
import env from "../config/env.config.js";

const SALT_ROUNDS = env.BCRYPT_SALT_ROUNDS;

/**
 * Hash a plain text password with bcrypt
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The hashed password
 * @throws {Error} If password is invalid
 */
export const hashPassword = async (password) => {
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new Error("Password must be a string with at least 6 characters");
  }

  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    throw new Error("Failed to hash password", { cause: error });
  }
};

/**
 * Compare a plain password with a hashed password
 * @param {string} password - The plain text password
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 * @throws {Error} If inputs are invalid
 */
export const comparePassword = async (password, hashedPassword) => {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a valid string");
  }

  if (!hashedPassword || typeof hashedPassword !== "string") {
    throw new Error("Hashed password must be a valid string");
  }

  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error("Failed to compare passwords", { cause: error });
  }
};

/**
 * Check if a string is a valid bcrypt hash
 * @param {string} hash - The string to check
 * @returns {boolean} True if it's a bcrypt hash, false otherwise
 */
export const isBcryptHash = (hash) => {
  return (
    (typeof hash === "string" && hash.startsWith("$2a$")) ||
    hash.startsWith("$2b$") ||
    hash.startsWith("$2y$")
  );
};

/* =====*** Password hashing utilities implemented ***==== */
