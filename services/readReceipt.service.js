import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { ApiError } from "../utils/ApiResponse.util.js";

// ====*** Read Receipt Access Helper ***=====

const assertConversationMembership = async (conversationId, userId) => {
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

// ====*** Read Receipt Message Helper ***=====

const getAccessibleMessage = async (conversationId, messageId, userId) => {
  const conversation = await assertConversationMembership(
    conversationId,
    userId
  );
  const message = await Message.findOne({
    _id: messageId,
    conversationId,
    isDeleted: false,
  });

  if (!message) {
    throw ApiError.notFound("Message not found");
  }

  return {
    conversation,
    message,
  };
};

// ====*** Mark Message Delivered ***=====

export const markMessageDeliveredReceipt = async (
  conversationId,
  messageId,
  userId
) => {
  const { conversation, message } = await getAccessibleMessage(
    conversationId,
    messageId,
    userId
  );

  if (message.senderId.toString() === userId.toString()) {
    throw ApiError.badRequest(
      "Sender cannot mark their own message as delivered"
    );
  }

  await message.markAsDelivered(userId);

  return {
    conversation,
    message,
  };
};

// ====*** Mark Message Read ***=====

export const markMessageReadReceipt = async (
  conversationId,
  messageId,
  userId
) => {
  const { conversation, message } = await getAccessibleMessage(
    conversationId,
    messageId,
    userId
  );

  if (message.senderId.toString() === userId.toString()) {
    throw ApiError.badRequest("Sender cannot mark their own message as read");
  }

  await message.markAsRead(userId);

  return {
    conversation,
    message,
  };
};

// ====*** Mark Conversation Read ***=====

export const markConversationReadReceipts = async (conversationId, userId) => {
  const conversation = await assertConversationMembership(
    conversationId,
    userId
  );
  const unreadMessages = await Message.find({
    conversationId,
    senderId: { $ne: userId },
    isDeleted: false,
    $or: [
      { status: { $ne: "read" } },
      { "receiptStatus.userId": { $ne: userId } },
    ],
  });

  for (const message of unreadMessages) {
    message.upsertReceipt(userId, "read");
    message.syncAggregateReceiptState();
    await message.save();
  }

  return {
    conversation,
    messages: unreadMessages,
    messageIds: unreadMessages.map((message) => message._id.toString()),
  };
};

// ====*** Get Message Receipts ***=====

export const getMessageReceipts = async (conversationId, messageId, userId) => {
  await assertConversationMembership(conversationId, userId);

  const message = await Message.findOne({
    _id: messageId,
    conversationId,
  }).populate("receiptStatus.userId", "phone displayName avatar");

  if (!message) {
    throw ApiError.notFound("Message not found");
  }

  return {
    message,
    receipts: message.receiptStatus,
  };
};
