import { Block } from "../models/block.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiResponse.util.js";

// ====*** Block Relation Query Helper ***=====

export const getBlockRelation = async (userAId, userBId) =>
  Block.findOne({
    isActive: true,
    $or: [
      {
        blockerId: userAId,
        blockedId: userBId,
      },
      {
        blockerId: userBId,
        blockedId: userAId,
      },
    ],
  });

// ====*** Block Status Helper ***=====

export const isEitherUserBlocked = async (userAId, userBId) => {
  const blockRelation = await getBlockRelation(userAId, userBId);

  return {
    isBlocked: Boolean(blockRelation),
    blockedBy: blockRelation?.blockerId?.toString() || null,
    relation: blockRelation,
  };
};

// ====*** Assert Users Can Communicate ***=====

export const assertUsersCanCommunicate = async (userAId, userBId) => {
  const blockState = await isEitherUserBlocked(userAId, userBId);

  if (blockState.isBlocked) {
    throw ApiError.forbidden(
      "Messaging is unavailable because one user has blocked the other"
    );
  }
};

// ====*** Block User ***=====

export const blockUser = async (blockerId, blockedId) => {
  if (blockerId.toString() === blockedId.toString()) {
    throw ApiError.badRequest("You cannot block yourself");
  }

  const blockedUser = await User.findById(blockedId);

  if (!blockedUser?.isActive) {
    throw ApiError.notFound("User not found");
  }

  const block = await Block.findOneAndUpdate(
    {
      blockerId,
      blockedId,
    },
    {
      blockerId,
      blockedId,
      isActive: true,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return {
    message: "User blocked successfully",
    block,
  };
};

// ====*** Unblock User ***=====

export const unblockUser = async (blockerId, blockedId) => {
  const block = await Block.findOneAndUpdate(
    {
      blockerId,
      blockedId,
      isActive: true,
    },
    {
      isActive: false,
    },
    {
      new: true,
    }
  );

  if (!block) {
    throw ApiError.notFound("Block record not found");
  }

  return {
    message: "User unblocked successfully",
    block,
  };
};

// ====*** Get Blocked Users ***=====

export const getBlockedUsers = async (blockerId) => {
  const blocks = await Block.find({
    blockerId,
    isActive: true,
  }).populate("blockedId", "phone displayName avatar isOnline lastSeen");

  return {
    blockedUsers: blocks.map((block) => ({
      ...block.toJSON(),
      blockedUser: block.blockedId,
    })),
  };
};
