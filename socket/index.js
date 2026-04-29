import { Server } from "socket.io";
import { env } from "../config/env.config.js";
import { registerGroupHandlers } from "./handlers/group.handler.js";
import { authenticateSocket } from "./middlewares/auth.socket.js";
import { registerMessageHandlers } from "./handlers/message.handler.js";
import { registerReadReceiptHandlers } from "./handlers/readReceipt.handler.js";
import { registerStatusHandlers } from "./handlers/status.handler.js";

// ====*** Socket.IO Instance State ***=====

let ioInstance = null;

// ====*** Socket.IO Server Configuration ***=====

export const initializeSocket = (httpServer) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: env.SOCKET_CORS_ORIGIN,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  ioInstance.use(authenticateSocket);

  ioInstance.on("connection", async (socket) => {
    try {
      await registerStatusHandlers(ioInstance, socket);
      registerMessageHandlers(ioInstance, socket);
      registerReadReceiptHandlers(ioInstance, socket);
      registerGroupHandlers(ioInstance, socket);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  return ioInstance;
};

// ====*** Get Socket.IO Instance ***=====

export const getIO = () => ioInstance;
