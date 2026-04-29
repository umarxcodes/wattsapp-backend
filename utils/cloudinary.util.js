import { v2 as cloudinary } from "cloudinary";
import { fileTypeFromBuffer } from "file-type";
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

// ====*** Upload File Type Detection ***=====

const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_MESSAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "application/pdf",
]);

/**
 * Detect the real file type from the binary payload.
 * @param {Buffer} buffer
 * @returns {Promise<{mime: string, ext: string}>}
 */
export const detectFileType = async (buffer) => {
  const detectedType = await fileTypeFromBuffer(buffer);

  if (!detectedType) {
    throw new Error("Unable to determine uploaded file type");
  }

  return detectedType;
};

// ====*** Upload Validation Helpers ***=====

/**
 * Validate an avatar upload using magic bytes instead of client-provided MIME.
 * @param {Buffer} buffer
 * @returns {Promise<{mime: string, ext: string}>}
 */
export const validateAvatarUpload = async (buffer) => {
  const detectedType = await detectFileType(buffer);

  if (!ALLOWED_AVATAR_MIME_TYPES.has(detectedType.mime)) {
    throw new Error("Unsupported avatar file type");
  }

  return detectedType;
};

/**
 * Validate a message upload using magic bytes instead of client-provided MIME.
 * @param {Buffer} buffer
 * @returns {Promise<{mime: string, ext: string}>}
 */
export const validateMessageMediaUpload = async (buffer) => {
  const detectedType = await detectFileType(buffer);

  if (!ALLOWED_MESSAGE_MIME_TYPES.has(detectedType.mime)) {
    throw new Error("Unsupported message media file type");
  }

  return detectedType;
};

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
