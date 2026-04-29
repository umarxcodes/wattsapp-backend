import { Router } from "express";
import {
  blockUserController,
  getBlockedUsersController,
  unblockUserController,
} from "../controllers/block.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { blockActionLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  blockUserSchema,
  unblockUserSchema,
} from "../validation/block.validator.js";

// ====*** Block Routes Setup ***=====

export const blockRouter = Router();

blockRouter.use(authenticate);

// ====*** Block User Routes ***=====

blockRouter.get("/", getBlockedUsersController);
blockRouter.post(
  "/",
  blockActionLimiter,
  validate(blockUserSchema),
  blockUserController
);
blockRouter.delete(
  "/:blockedUserId",
  blockActionLimiter,
  validate(unblockUserSchema),
  unblockUserController
);
