import { createServer } from "node:http";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.config.js";
import { env } from "./config/env.config.js";
import { connectRedis, disconnectRedis } from "./config/redis.config.js";
import {
  attachSocketRedisAdapter,
  closeSocket,
  initializeSocket,
} from "./socket/index.js";

// ====*** HTTP Server Creation ***=====

export const httpServer = createServer(app);
export const io = initializeSocket(httpServer);

// ====*** Start Server ***=====

export const startServer = async () => {
  await Promise.all([connectDB(), connectRedis()]);
  await attachSocketRedisAdapter();

  return new Promise((resolve, reject) => {
    httpServer.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
      resolve(httpServer);
    });

    httpServer.on("error", reject);
  });
};

// ====*** Graceful Shutdown - All Connections ***=====

export const stopServer = async () => {
  await new Promise((resolve, reject) => {
    io?.close(() => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  await Promise.all([closeSocket(), disconnectRedis(), disconnectDB()]);
};

// ====*** Process Signal Handling ***=====

const shutdown = async (signal) => {
  try {
    console.log(`Received ${signal}. Shutting down...`);
    await stopServer();
    process.exit(0);
  } catch (error) {
    console.error("Shutdown error:", error.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
}
