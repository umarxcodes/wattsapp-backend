import {
  markConversationReadReceipts,
  markMessageDeliveredReceipt,
  markMessageReadReceipt,
} from "../../services/readReceipt.service.js";

// ====*** message_delivered Socket Event Handler ***=====

const registerDeliveredReceiptHandler = (io, socket) => {
  socket.on("message_delivered", async ({ conversationId, messageId }) => {
    try {
      const { message } = await markMessageDeliveredReceipt(
        conversationId,
        messageId,
        socket.user.id
      );

      io.to(message.senderId.toString()).emit("message_delivered", {
        conversationId,
        messageId,
        deliveredTo: socket.user.id,
        deliveredAt: message.deliveredAt,
      });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** message_read Socket Event Handler ***=====

const registerReadReceiptHandler = (io, socket) => {
  socket.on("message_read", async ({ conversationId, messageId }) => {
    try {
      const result = messageId
        ? await markMessageReadReceipt(
            conversationId,
            messageId,
            socket.user.id
          )
        : await markConversationReadReceipts(conversationId, socket.user.id);

      if (messageId) {
        io.to(result.message.senderId.toString()).emit("message_read", {
          conversationId,
          messageIds: [result.message._id.toString()],
          readBy: socket.user.id,
          readAt: result.message.readAt,
        });
        return;
      }

      result.messages.forEach((message) => {
        io.to(message.senderId.toString()).emit("message_read", {
          conversationId,
          messageIds: [message._id.toString()],
          readBy: socket.user.id,
          readAt: message.readAt,
        });
      });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** Read Receipt Handler Registration ***=====

export const registerReadReceiptHandlers = (io, socket) => {
  registerDeliveredReceiptHandler(io, socket);
  registerReadReceiptHandler(io, socket);
};
