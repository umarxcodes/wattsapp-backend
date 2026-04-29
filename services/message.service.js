import { Block } from "../models/block.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiResponse.util.js";
import { uploadMessageMedia } from "../utils/cloudinary.util.js";
import { assertUsersCanCommunicate } from "./block.service.js";

// ====*** Message Service Constants ***=====

const MESSAGE_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

// ====*** Conversation Membership Helper ***=====

export const findConversationForUser = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    isActive: true,
  });

  if (!conversation) {
    throw ApiError.notFound("Conversation not found");
  }

  return conversation;
};

// ====*** Conversation Message Permission Helper ***=====

export const assertConversationCanReceiveMessage = async (
  conversation,
  senderId
) => {
  if (conversation.conversationType === "direct") {
    const receiverId = conversation.participants.find(
      (participantId) => participantId.toString() !== senderId.toString()
    );

    await assertUsersCanCommunicate(senderId, receiverId);
    return;
  }

  if (
    conversation.settings?.onlyAdminsCanSend &&
    !conversation.isAdmin(senderId)
  ) {
    throw ApiError.forbidden(
      "Only group admins can send messages in this group"
    );
  }
};

// ====*** Create Conversation ***=====

export const createConversation = async (senderId, receiverId) => {
  if (senderId === receiverId) {
    throw ApiError.badRequest("You cannot create a conversation with yourself");
  }

  const receiver = await User.findById(receiverId);

  if (!receiver?.isActive) {
    throw ApiError.notFound("Receiver not found");
  }

  await assertUsersCanCommunicate(senderId, receiverId);

  let conversation = await Conversation.findConversationBetweenUsers(
    senderId,
    receiverId
  );

  if (!conversation) {
    conversation = await Conversation.create({
      conversationType: "direct",
      participants: [senderId, receiverId],
      deletedBy: [],
    });
  } else {
    conversation.deletedBy = conversation.deletedBy.filter(
      (value) => value.toString() !== senderId.toString()
    );
    await conversation.save();
  }

  return Conversation.findById(conversation._id)
    .populate("participants", "phone displayName avatar isOnline lastSeen")
    .populate("lastMessage");
};

// ====*** Get User Conversations ***=====

export const getUserConversations = async (userId, page = 1, limit = 30) => {
  const skip = (page - 1) * limit;
  const filter = {
    participants: userId,
    isActive: true,
    deletedBy: { $ne: userId },
  };

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("participants", "phone displayName avatar isOnline lastSeen")
      .populate("admins", "phone displayName avatar")
      .populate("owner", "phone displayName avatar")
      .populate({
        path: "lastMessage",
        populate: {
          path: "senderId",
          select: "phone displayName avatar",
        },
      }),
    Conversation.countDocuments(filter),
  ]);

  return {
    conversations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

// ====*** Get Conversation ***=====

export const getConversationById = async (conversationId, userId) => {
  await findConversationForUser(conversationId, userId);

  const conversation = await Conversation.findOne({
    _id: conversationId,
    deletedBy: { $ne: userId },
  })
    .populate("participants", "phone displayName avatar isOnline lastSeen")
    .populate("admins", "phone displayName avatar")
    .populate("owner", "phone displayName avatar")
    .populate({
      path: "lastMessage",
      populate: {
        path: "senderId",
        select: "phone displayName avatar",
      },
    });

  if (!conversation) {
    throw ApiError.notFound("Conversation not found");
  }

  return conversation;
};

// ====*** Delete Conversation ***=====

export const deleteConversation = async (conversationId, userId) => {
  const conversation = await findConversationForUser(conversationId, userId);

  await Conversation.findByIdAndUpdate(conversation._id, {
    $addToSet: { deletedBy: userId },
  });

  return {
    message: "Conversation deleted successfully",
  };
};

// ====*** Build Message Payload ***=====

const buildMessagePayload = async (
  conversation,
  senderId,
  text,
  replyTo,
  file
) => {
  const payload = {
    conversationId: conversation._id,
    senderId,
    status: "sent",
  };

  if (typeof text === "string" && text.trim()) {
    payload.text = text.trim();
    payload.messageType = "text";
  }

  if (replyTo) {
    const replyMessage = await Message.findOne({
      _id: replyTo,
      conversationId: conversation._id,
      isDeleted: false,
    });

    if (replyMessage) {
      payload.replyTo = replyMessage._id;
    }
  }

  if (file) {
    const uploadResult = await uploadMessageMedia(file.buffer);
    payload.mediaUrl = uploadResult.secure_url;
    payload.mediaPublicId = uploadResult.public_id;
    payload.mediaMimeType = file.mimetype;
    payload.mediaSize = file.size;
    payload.mediaName = file.originalname;
    payload.messageType = file.mimetype.startsWith("image/")
      ? "image"
      : file.mimetype.startsWith("audio/")
        ? "voice"
        : "file";
  }

  if (!payload.text && !payload.mediaUrl) {
    throw ApiError.badRequest("Message text or file is required");
  }

  payload.receiptStatus = conversation.participants
    .filter((participantId) => participantId.toString() !== senderId.toString())
    .map((participantId) => ({
      userId: participantId,
      deliveredAt: null,
      readAt: null,
    }));

  return payload;
};

// ====*** Send Message ***=====

export const sendMessage = async (
  conversationId,
  senderId,
  text,
  replyTo = null,
  file = null
) => {
  const conversation = await findConversationForUser(conversationId, senderId);
  await assertConversationCanReceiveMessage(conversation, senderId);
  const payload = await buildMessagePayload(
    conversation,
    senderId,
    text,
    replyTo,
    file
  );
  const message = await Message.create(payload);

  conversation.lastMessage = message._id;
  conversation.lastMessageAt = new Date();
  conversation.deletedBy = conversation.deletedBy.filter(
    (value) => value.toString() !== senderId.toString()
  );
  await conversation.save();

  return Message.findById(message._id)
    .populate("senderId", "phone displayName avatar")
    .populate("replyTo", "text senderId messageType")
    .populate("receiptStatus.userId", "phone displayName avatar");
};

// ====*** Get Conversation Messages ***=====

export const getConversationMessages = async (
  conversationId,
  userId,
  cursor = null,
  limit = 50
) => {
  await findConversationForUser(conversationId, userId);

  const query = {
    conversationId,
  };

  if (cursor) {
    const cursorMessage = await Message.findById(cursor).select("createdAt");

    if (cursorMessage) {
      query.createdAt = { $lt: cursorMessage.createdAt };
    }
  }

  const results = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1)
    .populate("senderId", "phone displayName avatar")
    .populate("replyTo", "text senderId messageType")
    .populate("receiptStatus.userId", "phone displayName avatar");

  const hasMore = results.length > limit;
  const messages = hasMore ? results.slice(0, limit) : results;
  const nextCursor = hasMore
    ? messages[messages.length - 1]._id.toString()
    : null;

  return {
    messages,
    pagination: {
      cursor: nextCursor,
      limit,
      hasMore,
    },
  };
};

// ====*** Delete Message ***=====

export const deleteMessage = async (conversationId, messageId, userId) => {
  const message = await Message.findOne({
    _id: messageId,
    conversationId,
    senderId: userId,
    isDeleted: false,
  });

  if (!message) {
    throw ApiError.notFound("Message not found");
  }

  if (Date.now() - message.createdAt.getTime() > MESSAGE_DELETE_WINDOW_MS) {
    throw ApiError.forbidden("Messages can only be deleted within 24 hours");
  }

  await message.softDelete(userId);

  const latestMessage = await Message.findOne({
    conversationId,
  })
    .sort({ createdAt: -1 })
    .select("_id createdAt");

  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: latestMessage?._id || null,
    lastMessageAt: latestMessage?.createdAt || new Date(),
  });

  return {
    message: "Message deleted successfully",
    deletedMessageId: messageId,
    conversationId,
  };
};

// ====*** Edit Message ***=====

export const editMessage = async (
  conversationId,
  messageId,
  userId,
  newText
) => {
  const message = await Message.findOne({
    _id: messageId,
    conversationId,
    senderId: userId,
    isDeleted: false,
  });

  if (!message) {
    throw ApiError.notFound("Message not found");
  }

  if (message.messageType !== "text") {
    throw ApiError.badRequest("Only text messages can be edited");
  }

  if (Date.now() - message.createdAt.getTime() > MESSAGE_EDIT_WINDOW_MS) {
    throw ApiError.forbidden("Messages can only be edited within 15 minutes");
  }

  message.text = newText.trim();
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  return Message.findById(message._id)
    .populate("senderId", "phone displayName avatar")
    .populate("replyTo", "text senderId messageType")
    .populate("receiptStatus.userId", "phone displayName avatar");
};

// ====*** Mark Messages Read ***=====

export const markMessagesAsRead = async (conversationId, messageId, userId) => {
  const conversation = await findConversationForUser(conversationId, userId);

  const query = {
    conversationId,
    senderId: { $ne: userId },
    isDeleted: false,
  };

  if (messageId) {
    query._id = messageId;
  }

  const unreadMessages = await Message.find(query).select(
    "_id senderId receiptStatus"
  );

  if (!unreadMessages.length) {
    return {
      message: "No unread messages found",
      updatedMessages: [],
      senderIds: [],
      readAt: null,
    };
  }

  const senderIds = new Set();
  let latestReadAt = null;

  for (const message of unreadMessages) {
    senderIds.add(message.senderId.toString());
    latestReadAt = message.upsertReceipt(userId, "read");
    message.syncAggregateReceiptState();

    if (conversation.conversationType === "direct") {
      message.status = "read";
      message.readAt = latestReadAt;
      if (!message.deliveredAt) {
        message.deliveredAt = latestReadAt;
      }
    }

    await message.save();
  }

  return {
    message: "Messages marked as read",
    updatedMessages: unreadMessages.map((item) => item._id.toString()),
    senderIds: [...senderIds],
    readAt: latestReadAt,
  };
};

// ====*** Mark Message Delivered ***=====

export const markMessageAsDelivered = async (messageId, userId) => {
  const message = await Message.findOne({
    _id: messageId,
    senderId: { $ne: userId },
    isDeleted: false,
  });

  if (!message) {
    throw ApiError.notFound("Message not found");
  }

  await message.markAsDelivered(userId);

  return Message.findById(message._id)
    .populate("senderId", "phone displayName avatar")
    .populate("receiptStatus.userId", "phone displayName avatar");
};

// ====*** Upload Media Message ***=====

export const uploadMediaMessage = async (conversationId, senderId, file) =>
  sendMessage(conversationId, senderId, null, null, file);

// ====*** Add Reaction ***=====

export const addReaction = async (messageId, userId, emoji) => {
  const message = await Message.findById(messageId);

  if (!message || message.isDeleted) {
    throw ApiError.notFound("Message not found");
  }

  const existingReactionIndex = message.reactions.findIndex(
    (item) => item.userId.toString() === userId.toString()
  );

  if (!emoji) {
    if (existingReactionIndex >= 0) {
      message.reactions.splice(existingReactionIndex, 1);
    }
  } else if (existingReactionIndex >= 0) {
    message.reactions[existingReactionIndex].emoji = emoji;
  } else {
    message.reactions.push({ userId, emoji });
  }

  await message.save();

  return Message.findById(message._id)
    .populate("senderId", "phone displayName avatar")
    .populate("reactions.userId", "phone displayName avatar");
};

// ====*** Conversation Participant Helper ***=====

export const getConversationParticipantIds = async (conversationId) => {
  const conversation =
    await Conversation.findById(conversationId).select("participants");

  if (!conversation) {
    throw ApiError.notFound("Conversation not found");
  }

  return conversation.participants.map((value) => value.toString());
};

// ====*** User Contact Helper ***=====

export const getUserContactIds = async (userId) => {
  const conversations = await Conversation.find({
    participants: userId,
    isActive: true,
  }).select("participants");

  return [
    ...new Set(
      conversations.flatMap((conversation) =>
        conversation.participants
          .map((value) => value.toString())
          .filter((participantId) => participantId !== userId.toString())
      )
    ),
  ];
};

// ====*** Conversation Block Status Helper ***=====

export const getBlockedParticipantIdsForConversation = async (
  conversationId,
  userId
) => {
  const participantIds = await getConversationParticipantIds(conversationId);
  const blockedRelations = await Block.find({
    isActive: true,
    $or: [
      {
        blockerId: userId,
        blockedId: { $in: participantIds },
      },
      {
        blockedId: userId,
        blockerId: { $in: participantIds },
      },
    ],
  });

  return blockedRelations.map((relation) =>
    relation.blockerId.toString() === userId.toString()
      ? relation.blockedId.toString()
      : relation.blockerId.toString()
  );
};
