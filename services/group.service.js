import { Group } from "../models/group.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiResponse.util.js";
import { assertUsersCanCommunicate } from "./block.service.js";

// ====*** Group Membership Helpers ***=====

const ensureUsersExist = async (userIds) => {
  const users = await User.find({
    _id: { $in: userIds },
    isActive: true,
  })
    .select("_id")
    .lean();

  if (users.length !== userIds.length) {
    throw ApiError.badRequest("One or more users do not exist");
  }
};

const getGroupById = async (groupId) => {
  const group = await Group.findById(groupId)
    .populate("participants", "phone displayName avatar isOnline lastSeen")
    .populate("admins", "phone displayName avatar")
    .populate("owner", "phone displayName avatar")
    .populate("lastMessage")
    .lean(false);

  if (!group || group.conversationType !== "group") {
    throw ApiError.notFound("Group not found");
  }

  return group;
};

const assertGroupMember = async (groupId, userId) => {
  const group = await getGroupById(groupId);

  if (!group.hasParticipant(userId)) {
    throw ApiError.forbidden("You are not a member of this group");
  }

  return group;
};

const assertGroupAdmin = async (groupId, userId) => {
  const group = await assertGroupMember(groupId, userId);

  if (!group.isAdmin(userId)) {
    throw ApiError.forbidden("Only group admins can perform this action");
  }

  return group;
};

// ====*** Create Group ***=====

export const createGroup = async (creatorId, payload) => {
  const memberIds = [
    ...new Set([creatorId.toString(), ...(payload.memberIds || [])]),
  ];

  await ensureUsersExist(memberIds);

  const group = await Group.create({
    conversationType: "group",
    participants: memberIds,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    createdBy: creatorId,
    owner: creatorId,
    admins: [creatorId],
    settings: {
      onlyAdminsCanSend: Boolean(payload.onlyAdminsCanSend),
    },
  });

  return getGroupById(group._id);
};

// ====*** Get Group Details ***=====

export const getGroupDetails = async (groupId, userId) =>
  assertGroupMember(groupId, userId);

// ====*** Get User Groups ***=====

export const getUserGroups = async (userId) =>
  Group.find({
    conversationType: "group",
    participants: userId,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .populate("participants", "phone displayName avatar isOnline lastSeen")
    .populate("admins", "phone displayName avatar")
    .populate("owner", "phone displayName avatar")
    .populate("lastMessage")
    .lean();

// ====*** Update Group Details ***=====

export const updateGroupDetails = async (groupId, userId, payload) => {
  const group = await assertGroupAdmin(groupId, userId);

  if (payload.title) {
    group.title = payload.title.trim();
  }

  if (typeof payload.description === "string") {
    group.description = payload.description.trim() || null;
  }

  if (typeof payload.onlyAdminsCanSend === "boolean") {
    group.settings.onlyAdminsCanSend = payload.onlyAdminsCanSend;
  }

  await group.save();
  return getGroupById(group._id);
};

// ====*** Add Group Members ***=====

export const addGroupMembers = async (groupId, userId, memberIds) => {
  const group = await assertGroupAdmin(groupId, userId);
  const uniqueNewMemberIds = [...new Set(memberIds)].filter(
    (memberId) => !group.hasParticipant(memberId)
  );

  if (!uniqueNewMemberIds.length) {
    throw ApiError.badRequest("No new group members to add");
  }

  await ensureUsersExist(uniqueNewMemberIds);
  await Promise.all(
    uniqueNewMemberIds.map((memberId) =>
      assertUsersCanCommunicate(userId, memberId)
    )
  );
  group.participants.push(...uniqueNewMemberIds);
  await group.save();

  return getGroupById(group._id);
};

// ====*** Remove Group Member ***=====

export const removeGroupMember = async (groupId, actorId, memberId) => {
  const group = await assertGroupAdmin(groupId, actorId);

  if (!group.hasParticipant(memberId)) {
    throw ApiError.notFound("Group member not found");
  }

  if (group.owner._id.toString() === memberId.toString()) {
    throw ApiError.forbidden("Group owner cannot be removed");
  }

  group.participants = group.participants.filter(
    (participantId) => participantId.toString() !== memberId.toString()
  );
  group.admins = group.admins.filter(
    (adminId) => adminId.toString() !== memberId.toString()
  );

  await group.save();

  return getGroupById(group._id);
};

// ====*** Promote Group Admin ***=====

export const promoteGroupAdmin = async (groupId, actorId, memberId) => {
  const group = await assertGroupAdmin(groupId, actorId);

  if (group.owner._id.toString() !== actorId.toString()) {
    throw ApiError.forbidden("Only the group owner can promote another admin");
  }

  if (!group.hasParticipant(memberId)) {
    throw ApiError.notFound("Group member not found");
  }

  if (!group.isAdmin(memberId)) {
    group.admins.push(memberId);
    await group.save();
  }

  return getGroupById(group._id);
};

// ====*** Demote Group Admin ***=====

export const demoteGroupAdmin = async (groupId, actorId, memberId) => {
  const group = await assertGroupAdmin(groupId, actorId);

  if (group.owner._id.toString() !== actorId.toString()) {
    throw ApiError.forbidden("Only the group owner can demote an admin");
  }

  if (group.owner._id.toString() === memberId.toString()) {
    throw ApiError.forbidden("Group owner cannot be demoted");
  }

  group.admins = group.admins.filter(
    (adminId) => adminId.toString() !== memberId.toString()
  );
  await group.save();

  return getGroupById(group._id);
};

// ====*** Leave Group ***=====

export const leaveGroup = async (groupId, userId) => {
  const group = await assertGroupMember(groupId, userId);

  if (group.owner._id.toString() === userId.toString()) {
    throw ApiError.forbidden(
      "Group owner cannot leave without transferring ownership"
    );
  }

  group.participants = group.participants.filter(
    (participantId) => participantId.toString() !== userId.toString()
  );
  group.admins = group.admins.filter(
    (adminId) => adminId.toString() !== userId.toString()
  );

  await group.save();

  return {
    message: "You left the group successfully",
    groupId,
  };
};

// ====*** Transfer Group Ownership ***=====

export const transferGroupOwnership = async (groupId, actorId, nextOwnerId) => {
  const group = await assertGroupAdmin(groupId, actorId);

  if (group.owner._id.toString() !== actorId.toString()) {
    throw ApiError.forbidden("Only the group owner can transfer ownership");
  }

  if (!group.hasParticipant(nextOwnerId)) {
    throw ApiError.notFound("Next owner must be a current group member");
  }

  group.owner = nextOwnerId;

  if (!group.isAdmin(nextOwnerId)) {
    group.admins.push(nextOwnerId);
  }

  await group.save();

  return getGroupById(group._id);
};

// ====*** Group Auth Exports ***=====

export const assertGroupMembership = assertGroupMember;
export const assertGroupAdministration = assertGroupAdmin;
export const fetchGroupById = getGroupById;
