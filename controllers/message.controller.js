import asyncHandler from "express-async-handler";
import {
  addReaction,
  createConversation,
  deleteConversation,
  deleteMessage,
  editMessage,
  getConversationById,
  getConversationMessages,
  getUserConversations,
  markMessagesAsRead,
  sendMessage,
  uploadMediaMessage,
} from "../services/message.service.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { getIO } from "../socket/index.js";

// ====*** Emit Message Event Helper ***=====

const emitToConversation = (conversationId, eventName, payload) => {
  const io = getIO();

  if (io) {
    io.to(conversationId.toString()).emit(eventName, payload);
  }
};

// ====*** Emit Personal Room Helper ***=====

const emitToPersonalRoom = (roomId, eventName, payload) => {
  const io = getIO();

  if (io) {
    io.to(roomId.toString()).emit(eventName, payload);
  }
};

// ====*** Conversation Controllers ***=====

export const createConversationController = asyncHandler(async (req, res) => {
  const conversation = await createConversation(
    req.user.id,
    req.body.receiverId
  );
  res
    .status(201)
    .json(
      ApiResponse.created("Conversation created successfully", { conversation })
    );
});

export const getConversationsController = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 30);
  const result = await getUserConversations(req.user.id, page, limit);
  res
    .status(200)
    .json(ApiResponse.ok("Conversations fetched successfully", result));
});

export const getConversationController = asyncHandler(async (req, res) => {
  const conversation = await getConversationById(
    req.params.conversationId,
    req.user.id
  );

  res
    .status(200)
    .json(
      ApiResponse.ok("Conversation fetched successfully", { conversation })
    );
});

export const deleteConversationController = asyncHandler(async (req, res) => {
  const result = await deleteConversation(
    req.params.conversationId,
    req.user.id
  );
  res.status(200).json(ApiResponse.ok(result.message));
});

// ====*** Message Controllers ***=====

export const sendMessageController = asyncHandler(async (req, res) => {
  const message = await sendMessage(
    req.params.conversationId,
    req.user.id,
    req.body.text,
    req.body.replyTo,
    req.file || null
  );

  emitToConversation(req.params.conversationId, "new_message", message);
  emitToPersonalRoom(req.user.id, "message_sent", message);

  res
    .status(201)
    .json(ApiResponse.created("Message sent successfully", { message }));
});

export const getMessagesController = asyncHandler(async (req, res) => {
  const result = await getConversationMessages(
    req.params.conversationId,
    req.user.id,
    req.query.cursor || null,
    Number(req.query.limit || 50)
  );

  res.status(200).json(ApiResponse.ok("Messages fetched successfully", result));
});

export const deleteMessageController = asyncHandler(async (req, res) => {
  const result = await deleteMessage(
    req.params.conversationId,
    req.params.messageId,
    req.user.id
  );

  emitToConversation(req.params.conversationId, "message_deleted", {
    conversationId: req.params.conversationId,
    messageId: req.params.messageId,
    deletedBy: req.user.id,
  });

  res.status(200).json(ApiResponse.ok(result.message));
});

export const editMessageController = asyncHandler(async (req, res) => {
  const message = await editMessage(
    req.params.conversationId,
    req.params.messageId,
    req.user.id,
    req.body.text
  );

  emitToConversation(req.params.conversationId, "message_edited", message);

  res
    .status(200)
    .json(ApiResponse.ok("Message edited successfully", { message }));
});

export const markReadController = asyncHandler(async (req, res) => {
  const result = await markMessagesAsRead(
    req.params.conversationId,
    req.params.messageId,
    req.user.id
  );

  result.senderIds.forEach((senderId) => {
    emitToPersonalRoom(senderId, "message_read", {
      conversationId: req.params.conversationId,
      messageIds: result.updatedMessages,
      readBy: req.user.id,
      readAt: result.readAt,
    });
  });

  res.status(200).json(ApiResponse.ok(result.message, result));
});

export const uploadMediaController = asyncHandler(async (req, res) => {
  const message = await uploadMediaMessage(
    req.params.conversationId,
    req.user.id,
    req.file
  );

  emitToConversation(req.params.conversationId, "new_message", message);
  emitToPersonalRoom(req.user.id, "message_sent", message);

  res
    .status(201)
    .json(ApiResponse.created("Media message sent successfully", { message }));
});

export const addReactionController = asyncHandler(async (req, res) => {
  const message = await addReaction(
    req.params.messageId,
    req.user.id,
    req.body.emoji ?? null
  );

  emitToConversation(message.conversationId, "message_reaction", message);

  res
    .status(200)
    .json(ApiResponse.ok("Reaction updated successfully", { message }));
});
