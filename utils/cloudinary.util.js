import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import { env } from "../config/env.config.js";

// ====*** Cloudinary Configuration ***=====

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME || undefined,
  api_key: env.CLOUDINARY_API_KEY || undefined,
  api_secret: env.CLOUDINARY_API_SECRET || undefined,
});

// ====*** Cloudinary Guard ***=====

const assertCloudinaryConfigured = () => {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary is not configured");
  }
};

// ====*** Upload Buffer ***=====

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {object} options
 * @returns {Promise<object>}
 */
export const uploadBufferToCloudinary = (buffer, options = {}) => {
  assertCloudinaryConfigured();

  if (!Buffer.isBuffer(buffer)) {
    throw new Error("A valid file buffer is required");
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
};

// ====*** Upload Avatar ***=====

/**
 * Upload an avatar image to Cloudinary.
 * @param {Buffer} buffer
 * @param {string} publicId
 * @returns {Promise<object>}
 */
export const uploadAvatar = (buffer, publicId) =>
  uploadBufferToCloudinary(buffer, {
    folder: "wattsapp/avatars",
    public_id: publicId,
    transformation: [
      {
        width: 300,
        height: 300,
        crop: "fill",
        gravity: "face",
      },
      {
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  });

// ====*** Upload Message Media ***=====

/**
 * Upload message media to Cloudinary.
 * @param {Buffer} buffer
 * @param {object} options
 * @returns {Promise<object>}
 */
export const uploadMessageMedia = (buffer, options = {}) =>
  uploadBufferToCloudinary(buffer, {
    folder: "wattsapp/messages",
    ...options,
  });

// ====*** Delete Asset ***=====

/**
 * Delete a Cloudinary asset.
 * @param {string} publicId
 * @returns {Promise<object>}
 */
export const deleteCloudinaryAsset = async (publicId) => {
  if (!publicId) {
    return { result: "not-found" };
  }

  assertCloudinaryConfigured();
  return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
};

// ====*** Delete Avatar ***=====

/**
 * Delete an avatar asset.
 * @param {string} publicId
 * @returns {Promise<object>}
 */
export const deleteAvatar = (publicId) => deleteCloudinaryAsset(publicId);
