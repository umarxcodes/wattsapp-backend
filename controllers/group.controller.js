import asyncHandler from "express-async-handler";
import {
  addGroupMembers,
  createGroup,
  demoteGroupAdmin,
  getGroupDetails,
  getUserGroups,
  leaveGroup,
  promoteGroupAdmin,
  removeGroupMember,
  transferGroupOwnership,
  updateGroupDetails,
} from "../services/group.service.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { getIO } from "../socket/index.js";

// ====*** Group Socket Emit Helper ***=====

const emitGroupEvent = (groupId, eventName, payload) => {
  const io = getIO();

  if (io) {
    io.to(groupId.toString()).emit(eventName, payload);
  }
};

// ====*** Create Group Controller ***=====

export const createGroupController = asyncHandler(async (req, res) => {
  const group = await createGroup(req.user.id, req.body);
  res
    .status(201)
    .json(ApiResponse.created("Group created successfully", { group }));
});

// ====*** Get User Groups Controller ***=====

export const getUserGroupsController = asyncHandler(async (req, res) => {
  const groups = await getUserGroups(req.user.id);
  res
    .status(200)
    .json(ApiResponse.ok("Groups fetched successfully", { groups }));
});

// ====*** Get Group Details Controller ***=====

export const getGroupDetailsController = asyncHandler(async (req, res) => {
  const group = await getGroupDetails(req.params.groupId, req.user.id);
  res.status(200).json(ApiResponse.ok("Group fetched successfully", { group }));
});

// ====*** Update Group Details Controller ***=====

export const updateGroupDetailsController = asyncHandler(async (req, res) => {
  const group = await updateGroupDetails(
    req.params.groupId,
    req.user.id,
    req.body
  );
  emitGroupEvent(req.params.groupId, "group_updated", group);
  res.status(200).json(ApiResponse.ok("Group updated successfully", { group }));
});

// ====*** Add Group Members Controller ***=====

export const addGroupMembersController = asyncHandler(async (req, res) => {
  const group = await addGroupMembers(
    req.params.groupId,
    req.user.id,
    req.body.memberIds
  );
  emitGroupEvent(req.params.groupId, "group_members_added", group);
  res
    .status(200)
    .json(ApiResponse.ok("Group members added successfully", { group }));
});

// ====*** Remove Group Member Controller ***=====

export const removeGroupMemberController = asyncHandler(async (req, res) => {
  const group = await removeGroupMember(
    req.params.groupId,
    req.user.id,
    req.params.memberId
  );
  emitGroupEvent(req.params.groupId, "group_member_removed", group);
  res
    .status(200)
    .json(ApiResponse.ok("Group member removed successfully", { group }));
});

// ====*** Promote Group Admin Controller ***=====

export const promoteGroupAdminController = asyncHandler(async (req, res) => {
  const group = await promoteGroupAdmin(
    req.params.groupId,
    req.user.id,
    req.params.memberId
  );
  emitGroupEvent(req.params.groupId, "group_admin_promoted", group);
  res
    .status(200)
    .json(ApiResponse.ok("Group admin promoted successfully", { group }));
});

// ====*** Demote Group Admin Controller ***=====

export const demoteGroupAdminController = asyncHandler(async (req, res) => {
  const group = await demoteGroupAdmin(
    req.params.groupId,
    req.user.id,
    req.params.memberId
  );
  emitGroupEvent(req.params.groupId, "group_admin_demoted", group);
  res
    .status(200)
    .json(ApiResponse.ok("Group admin demoted successfully", { group }));
});

// ====*** Transfer Group Ownership Controller ***=====

export const transferGroupOwnershipController = asyncHandler(
  async (req, res) => {
    const group = await transferGroupOwnership(
      req.params.groupId,
      req.user.id,
      req.body.nextOwnerId
    );
    emitGroupEvent(req.params.groupId, "group_owner_transferred", group);
    res
      .status(200)
      .json(
        ApiResponse.ok("Group ownership transferred successfully", { group })
      );
  }
);

// ====*** Leave Group Controller ***=====

export const leaveGroupController = asyncHandler(async (req, res) => {
  const result = await leaveGroup(req.params.groupId, req.user.id);
  emitGroupEvent(req.params.groupId, "group_member_left", {
    groupId: req.params.groupId,
    userId: req.user.id,
  });
  res.status(200).json(ApiResponse.ok(result.message));
});
