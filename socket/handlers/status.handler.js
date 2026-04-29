import { User } from "../../models/user.model.js";
import { Conversation } from "../../models/conversation.model.js";
import { getUserContactIds } from "../../services/message.service.js";
import {
  getUserOnlineStatus,
  ONLINE_STATUS_REFRESH_INTERVAL_MS,
  refreshUserOnlineTTL,
  setUserOffline,
  setUserOnline,
  setUserSocketId,
} from "../../utils/onlineStatus.util.js";

// ====*** Broadcast Online To Contacts ***=====

const broadcastStatusToContacts = async (io, userId, eventName, payload) => {
  const contactIds = await getUserContactIds(userId);
  contactIds.forEach((contactId) => {
    io.to(contactId).emit(eventName, payload);
  });
};

// ====*** User Connect - Set Online In Redis ***=====

const handleUserConnect = async (io, socket) => {
  const userId = socket.user.id;
  const conversations = await Conversation.find({
    participants: userId,
    isActive: true,
  }).select("_id");

  await Promise.all([
    setUserOnline(userId),
    setUserSocketId(userId, socket.id),
    User.findByIdAndUpdate(userId, {
      isOnline: true,
    }),
  ]);

  socket.join(userId);
  conversations.forEach((conversation) => {
    socket.join(conversation._id.toString());
  });

  await broadcastStatusToContacts(io, userId, "user_online", {
    userId,
    isOnline: true,
  });
};

// ====*** Keep Alive Interval - Refresh Redis TTL ***=====

const startKeepAlive = (socket) => {
  const interval = setInterval(async () => {
    try {
      await refreshUserOnlineTTL(socket.user.id);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  }, ONLINE_STATUS_REFRESH_INTERVAL_MS);

  socket.data.keepAliveInterval = interval;
};

// ====*** User Disconnect - Set Offline ***=====

const handleUserDisconnect = async (io, socket) => {
  if (socket.data.keepAliveInterval) {
    clearInterval(socket.data.keepAliveInterval);
  }

  const userId = socket.user?.id;

  if (!userId) {
    return;
  }

  const lastSeen = await setUserOffline(userId);

  User.findByIdAndUpdate(userId, {
    isOnline: false,
    lastSeen: new Date(lastSeen),
  }).catch((error) => {
    console.error("Failed to persist last seen:", error.message);
  });

  await broadcastStatusToContacts(io, userId, "user_offline", {
    userId,
    isOnline: false,
    lastSeen,
  });
};

// ====*** Online Status Query Handler ***=====

const registerOnlineStatusQuery = (socket) => {
  socket.on("online_status", async ({ userId }) => {
    try {
      const status = await getUserOnlineStatus(userId);

      socket.emit("online_status", {
        userId,
        ...status,
      });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
};

// ====*** Status Socket Handler Registration ***=====

export const registerStatusHandlers = async (io, socket) => {
  await handleUserConnect(io, socket);
  startKeepAlive(socket);
  registerOnlineStatusQuery(socket);

  socket.on("disconnect", async () => {
    try {
      await handleUserDisconnect(io, socket);
    } catch (error) {
      console.error("Socket disconnect handler error:", error.message);
    }
  });
};
