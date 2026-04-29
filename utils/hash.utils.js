import bcrypt from "bcrypt";
import { env } from "../config/env.config.js";

// ====*** Password Hashing Helpers ***=====

/**
 * Hash a plain text password.
 * @param {string} value
 * @returns {Promise<string>}
 */
export const hashPassword = async (value) => {
  if (typeof value !== "string" || value.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }

  return bcrypt.hash(value, env.BCRYPT_SALT_ROUNDS);
};

/**
 * Compare a plain text password to a bcrypt hash.
 * @param {string} value
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (value, hash) => {
  if (typeof value !== "string" || typeof hash !== "string") {
    throw new Error("Password and hash must be strings");
  }

  return bcrypt.compare(value, hash);
};

/**
 * Determine whether a string looks like a bcrypt hash.
 * @param {string} value
 * @returns {boolean}
 */
export const isBcryptHash = (value) =>
  typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
