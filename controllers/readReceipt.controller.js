import asyncHandler from "express-async-handler";
import {
  getMessageReceipts,
  markConversationReadReceipts,
  markMessageDeliveredReceipt,
  markMessageReadReceipt,
} from "../services/readReceipt.service.js";
import { ApiResponse } from "../utils/ApiResponse.util.js";
import { getIO } from "../socket/index.js";

// ====*** Read Receipt Socket Emit Helper ***=====

const emitReceiptEvent = (roomId, eventName, payload) => {
  const io = getIO();

  if (io) {
    io.to(roomId.toString()).emit(eventName, payload);
  }
};

// ====*** Mark Delivered Receipt Controller ***=====

export const markDeliveredReceiptController = asyncHandler(async (req, res) => {
  const { conversation, message } = await markMessageDeliveredReceipt(
    req.params.conversationId,
    req.params.messageId,
    req.user.id
  );

  emitReceiptEvent(message.senderId, "message_delivered", {
    conversationId: conversation._id.toString(),
    messageId: message._id.toString(),
    deliveredTo: req.user.id,
    deliveredAt: message.deliveredAt,
  });

  res
    .status(200)
    .json(ApiResponse.ok("Message marked as delivered", { message }));
});

// ====*** Mark Read Receipt Controller ***=====

export const markReadReceiptController = asyncHandler(async (req, res) => {
  const { conversation, message } = await markMessageReadReceipt(
    req.params.conversationId,
    req.params.messageId,
    req.user.id
  );

  emitReceiptEvent(message.senderId, "message_read", {
    conversationId: conversation._id.toString(),
    messageIds: [message._id.toString()],
    readBy: req.user.id,
    readAt: message.readAt,
  });

  res.status(200).json(ApiResponse.ok("Message marked as read", { message }));
});

// ====*** Mark Conversation Read Controller ***=====

export const markConversationReadController = asyncHandler(async (req, res) => {
  const result = await markConversationReadReceipts(
    req.params.conversationId,
    req.user.id
  );

  const io = getIO();
  if (io) {
    result.messages.forEach((message) => {
      io.to(message.senderId.toString()).emit("message_read", {
        conversationId: req.params.conversationId,
        messageIds: [message._id.toString()],
        readBy: req.user.id,
        readAt: message.readAt,
      });
    });
  }

  res.status(200).json(
    ApiResponse.ok("Conversation marked as read", {
      messageIds: result.messageIds,
    })
  );
});

// ====*** Get Message Receipts Controller ***=====

export const getMessageReceiptsController = asyncHandler(async (req, res) => {
  const result = await getMessageReceipts(
    req.params.conversationId,
    req.params.messageId,
    req.user.id
  );

  res
    .status(200)
    .json(ApiResponse.ok("Message receipts fetched successfully", result));
});
