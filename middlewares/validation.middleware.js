// middlewares/validation.middleware.js
/** Feature: Request validation middleware using Zod schemas */
/** Feature: Automatic validation of request body, params, query, and files */

import { ApiError } from "../utils/ApiResponse.util.js";

/**
 * Validation middleware factory
 * @param {object} schema - Zod schema object with body, params, query, cookies, or file properties
 * @returns {function} Express middleware function
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      // Validate route parameters
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      // Validate cookies
      if (schema.cookies) {
        req.cookies = await schema.cookies.parseAsync(req.cookies);
      }

      // Validate file
      if (schema.file && req.file) {
        req.file = await schema.file.parseAsync(req.file);
      }

      next();
    } catch (error) {
      if (error.name === "ZodError") {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return next(new ApiError(400, "Validation failed", errors));
      }

      next(error);
    }
  };
};

/* =====*** Validation middleware implemented ***==== */
