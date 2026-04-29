import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { redis } from "../config/redis.config.js";
import { env } from "../config/env.config.js";
import { registerGroupHandlers } from "./handlers/group.handler.js";
import { authenticateSocket } from "./middlewares/auth.socket.js";
import { registerMessageHandlers } from "./handlers/message.handler.js";
import { registerReadReceiptHandlers } from "./handlers/readReceipt.handler.js";
import { registerStatusHandlers } from "./handlers/status.handler.js";

// ====*** Socket.IO Instance State ***=====

let ioInstance = null;
let socketPubClient = null;
let socketSubClient = null;

// ====*** Socket.IO Redis Adapter Setup ***=====

export const attachSocketRedisAdapter = async () => {
  if (!ioInstance) {
    return;
  }

  if (socketPubClient && socketSubClient) {
    return;
  }

  socketPubClient = redis.duplicate();
  socketSubClient = redis.duplicate();
  socketPubClient.on("error", (error) => {
    console.error("Socket.IO Redis publisher error:", error.message);
  });
  socketSubClient.on("error", (error) => {
    console.error("Socket.IO Redis subscriber error:", error.message);
  });
  await Promise.all([socketPubClient.connect(), socketSubClient.connect()]);
  ioInstance.adapter(createAdapter(socketPubClient, socketSubClient));
};

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

// ====*** Close Socket.IO Resources ***=====

export const closeSocket = async () => {
  if (socketPubClient) {
    await socketPubClient.quit();
    socketPubClient = null;
  }

  if (socketSubClient) {
    await socketSubClient.quit();
    socketSubClient = null;
  }
};
