/* Request validation middleware using Zod schema validation */

import { ApiError } from "../utils/ApiResponse.util.js";

/* Create reusable middleware for validating incoming requests */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      /* Validate request body data */
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      /* Validate route parameters */
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      /* Validate query string parameters */
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      /* Validate request cookies */
      if (schema.cookies) {
        req.cookies = await schema.cookies.parseAsync(req.cookies);
      }

      /* Validate uploaded file if present */
      if (schema.file && req.file) {
        req.file = await schema.file.parseAsync(req.file);
      }

      next();
    } catch (error) {
      /* Handle Zod validation errors with structured response */
      if (error.name === "ZodError") {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return next(new ApiError(400, "Validation failed", errors));
      }

      /* Forward unexpected errors to global error handler */
      next(error);
    }
  };
};
