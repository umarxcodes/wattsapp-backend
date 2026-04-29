import {
  addReaction,
  findConversationForUser,
  getConversationParticipantIds,
  sendMessage,
} from "../../services/message.service.js";

// ====*** join_conversation Socket Event Handler ***=====

const registerJoinConversationHandler = (socket) => {
  socket.on("join_conversation", async ({ conversationId }) => {
    try {
      await findConversationForUser(conversationId, socket.user.id);
      socket.join(conversationId);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** leave_conversation Socket Event Handler ***=====

const registerLeaveConversationHandler = (socket) => {
  socket.on("leave_conversation", async ({ conversationId }) => {
    try {
      socket.leave(conversationId);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** send_message Socket Event Handler ***=====

const registerSendMessageHandler = (io, socket) => {
  socket.on("send_message", async (payload) => {
    try {
      const message = await sendMessage(
        payload.conversationId,
        socket.user.id,
        payload.text,
        payload.replyTo || null,
        null
      );

      io.to(payload.conversationId).emit("new_message", message);
      socket.emit("message_sent", message);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** Typing Indicator Broadcast ***=====

const registerTypingHandlers = (io, socket) => {
  socket.on("typing_start", async ({ conversationId }) => {
    try {
      socket.to(conversationId).emit("typing_indicator", {
        conversationId,
        userId: socket.user.id,
        displayName: socket.user.displayName,
        isTyping: true,
      });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("typing_stop", async ({ conversationId }) => {
    try {
      socket.to(conversationId).emit("typing_indicator", {
        conversationId,
        userId: socket.user.id,
        displayName: socket.user.displayName,
        isTyping: false,
      });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** message_reaction Socket Event Handler ***=====

const registerReactionHandler = (io, socket) => {
  socket.on("message_reaction", async ({ messageId, emoji }) => {
    try {
      const message = await addReaction(
        messageId,
        socket.user.id,
        emoji ?? null
      );
      const participantIds = await getConversationParticipantIds(
        message.conversationId
      );

      participantIds.forEach((participantId) => {
        io.to(participantId).emit("message_reaction", message);
      });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** Message Socket Handler Registration ***=====

export const registerMessageHandlers = (io, socket) => {
  registerJoinConversationHandler(socket);
  registerLeaveConversationHandler(socket);
  registerSendMessageHandler(io, socket);
  registerTypingHandlers(io, socket);
  registerReactionHandler(io, socket);
};
