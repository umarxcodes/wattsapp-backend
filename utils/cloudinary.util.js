/* Cloudinary integration for secure avatar upload, deletion, and optimization */

import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import env from "../config/env.config.js";

/* Configure Cloudinary with environment credentials */
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/* Upload avatar image with optimization and transformation */
export const uploadAvatar = (buffer, publicId) => {
  /* Validate image buffer */
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error("Valid image buffer is required");
  }

  /* Validate public ID */
  if (!publicId || typeof publicId !== "string") {
    throw new Error("Valid public ID is required");
  }

  return new Promise((resolve, reject) => {
    /* Create Cloudinary upload stream */
    const stream = cloudinary.uploader.upload_stream(
      {
        /* Set public identifier for image */
        public_id: publicId,

        /* Store avatars in dedicated folder */
        folder: "avatars",

        /* Image optimization and face-focused cropping */
        transformation: [
          { width: 200, height: 200, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],

        /* Restrict allowed image formats */
        allowed_formats: ["jpg", "png", "jpeg", "webp"],

        /* Limit file size for security */
        max_bytes: 5 * 1024 * 1024,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error.message);
          return reject(new Error("Failed to upload avatar"));
        }

        console.log(`Avatar uploaded successfully: ${result.secure_url}`);
        resolve(result);
      }
    );

    /* Convert buffer into stream for upload */
    Readable.from(buffer).pipe(stream);
  });
};

/* Delete avatar from Cloudinary storage */
export const deleteAvatar = (publicId) => {
  /* Validate public ID */
  if (!publicId || typeof publicId !== "string") {
    throw new Error("Valid public ID is required");
  }

  return cloudinary.uploader
    .destroy(publicId)
    .then((result) => {
      console.log(`Avatar deleted: ${publicId}`);
      return result;
    })
    .catch((error) => {
      console.error("Cloudinary delete error:", error.message);
      throw new Error("Failed to delete avatar");
    });
};

/* Generate optimized Cloudinary avatar URL */
export const getAvatarUrl = (publicId, options = {}) => {
  if (!publicId) return null;

  /* Default transformation settings for avatars */
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
