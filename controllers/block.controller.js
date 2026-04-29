import asyncHandler from "express-async-handler";
import {
  blockUser,
  getBlockedUsers,
  unblockUser,
} from "../services/block.service.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";

// ====*** Block User Controller ***=====

export const blockUserController = asyncHandler(async (req, res) => {
  const result = await blockUser(req.user.id, req.body.blockedUserId);
  res
    .status(201)
    .json(ApiResponse.created(result.message, { block: result.block }));
});

// ====*** Unblock User Controller ***=====

export const unblockUserController = asyncHandler(async (req, res) => {
  const result = await unblockUser(req.user.id, req.params.blockedUserId);
  res.status(200).json(ApiResponse.ok(result.message, { block: result.block }));
});

// ====*** Get Blocked Users Controller ***=====

export const getBlockedUsersController = asyncHandler(async (req, res) => {
  const result = await getBlockedUsers(req.user.id);
  res
    .status(200)
    .json(ApiResponse.ok("Blocked users fetched successfully", result));
});
