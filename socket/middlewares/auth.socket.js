import { redis } from "../../config/redis.config.js";
import { User } from "../../models/user.model.js";
import { verifyToken } from "../../utils/jwt.utils.js";

// ====*** JWT Socket Handshake Auth ***=====

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;

    if (!token) {
      socket.disconnect(true);
      next(new Error("Socket authentication failed"));
      return;
    }

    const isBlacklisted = await redis.get(`blacklist:${token}`);

    if (isBlacklisted) {
      socket.disconnect(true);
      next(new Error("Socket authentication failed"));
      return;
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select(
      "_id displayName phone isActive isVerified"
    );

    if (!user || !user.isActive || !user.isVerified) {
      socket.disconnect(true);
      next(new Error("Socket authentication failed"));
      return;
    }

    socket.user = {
      id: user._id.toString(),
      displayName: user.displayName,
      phone: user.phone,
    };

    next();
  } catch {
    socket.disconnect(true);
    next(new Error("Socket authentication failed"));
  }
};
