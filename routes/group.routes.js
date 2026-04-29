import { Router } from "express";
import {
  addGroupMembersController,
  createGroupController,
  demoteGroupAdminController,
  getGroupDetailsController,
  getUserGroupsController,
  leaveGroupController,
  promoteGroupAdminController,
  removeGroupMemberController,
  transferGroupOwnershipController,
  updateGroupDetailsController,
} from "../controllers/group.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { groupActionLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  addGroupMembersSchema,
  createGroupSchema,
  groupIdSchema,
  groupMemberParamsSchema,
  transferGroupOwnershipSchema,
  updateGroupSchema,
} from "../validation/group.validator.js";

// ====*** Group Routes Setup ***=====

export const groupRouter = Router();

groupRouter.use(authenticate);

// ====*** Group Base Routes ***=====

groupRouter.get("/", getUserGroupsController);
groupRouter.post(
  "/",
  groupActionLimiter,
  validate(createGroupSchema),
  createGroupController
);
groupRouter.get(
  "/:groupId",
  validate(groupIdSchema),
  getGroupDetailsController
);
groupRouter.patch(
  "/:groupId",
  groupActionLimiter,
  validate(updateGroupSchema),
  updateGroupDetailsController
);

// ====*** Group Membership Routes ***=====

groupRouter.post(
  "/:groupId/members",
  groupActionLimiter,
  validate(addGroupMembersSchema),
  addGroupMembersController
);
groupRouter.delete(
  "/:groupId/members/:memberId",
  groupActionLimiter,
  validate(groupMemberParamsSchema),
  removeGroupMemberController
);
groupRouter.post(
  "/:groupId/admins/:memberId",
  groupActionLimiter,
  validate(groupMemberParamsSchema),
  promoteGroupAdminController
);
groupRouter.delete(
  "/:groupId/admins/:memberId",
  groupActionLimiter,
  validate(groupMemberParamsSchema),
  demoteGroupAdminController
);
groupRouter.post(
  "/:groupId/owner",
  groupActionLimiter,
  validate(transferGroupOwnershipSchema),
  transferGroupOwnershipController
);
groupRouter.post(
  "/:groupId/leave",
  groupActionLimiter,
  validate(groupIdSchema),
  leaveGroupController
);
