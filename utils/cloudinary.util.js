// utils/cloudinary.util.js
/** Feature: Cloudinary integration for avatar upload and management */
/** Feature: Secure image handling with validation and optimization */

import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import env from "../config/env.config.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Upload avatar to Cloudinary with optimization
 * @param {Buffer} buffer - The image buffer
 * @param {string} publicId - The public ID for the image
 * @returns {Promise<object>} Upload result with secure URL
 * @throws {Error} If upload fails
 */
export const uploadAvatar = (buffer, publicId) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Valid image buffer is required");
  }

  if (!publicId || typeof publicId !== "string") {
    throw new Error("Valid public ID is required");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder: "avatars",
        transformation: [
          { width: 200, height: 200, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        max_bytes: 5 * 1024 * 1024, // 5MB limit
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error.message);
          reject(new Error("Failed to upload avatar"));
        } else {
          console.log(`✅ Avatar uploaded: ${result.secure_url}`);
          resolve(result);
        }
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

/**
 * Delete avatar from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<object>} Delete result
 * @throws {Error} If deletion fails
 */
export const deleteAvatar = (publicId) => {
  if (!publicId || typeof publicId !== "string") {
    throw new Error("Valid public ID is required");
  }

  return cloudinary.uploader
    .destroy(publicId)
    .then((result) => {
      console.log(`✅ Avatar deleted: ${publicId}`);
      return result;
    })
    .catch((error) => {
      console.error("❌ Cloudinary delete error:", error.message);
      throw new Error("Failed to delete avatar");
    });
};

/**
 * Get optimized avatar URL with transformations
 * @param {string} publicId - The public ID of the avatar
 * @param {object} options - Transformation options
 * @returns {string} Optimized Cloudinary URL
 */
export const getAvatarUrl = (publicId, options = {}) => {
  if (!publicId) return null;

  const defaultOptions = {
    width: 200,
    height: 200,
    crop: "fill",
    quality: "auto",
    fetch_format: "auto",
    ...options,
  };

  return cloudinary.url(publicId, defaultOptions);
};

/* =====*** Cloudinary utilities implemented ***==== */
