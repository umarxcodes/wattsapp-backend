import { ZodError } from "zod";
import { ApiError } from "../utils/ApiResponse.util.js";

// ====*** Request Validation Middleware ***=====

export const validate = (schema) => async (req, res, next) => {
  try {
    if (schema.body) {
      req.body = await schema.body.parseAsync(req.body);
    }

    if (schema.params) {
      req.params = await schema.params.parseAsync(req.params);
    }

    if (schema.query) {
      req.query = await schema.query.parseAsync(req.query);
    }

    if (schema.cookies) {
      req.cookies = await schema.cookies.parseAsync(req.cookies);
    }

    if (schema.file && req.file) {
      req.file = await schema.file.parseAsync(req.file);
    }

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      next(
        ApiError.badRequest(
          "Validation failed",
          error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          }))
        )
      );
      return;
    }

    next(error);
  }
};
