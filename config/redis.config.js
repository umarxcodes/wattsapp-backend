// config/redis.config.js
/** Feature: Redis client initialization with error handling and retry logic */
/** Feature: Graceful shutdown for Redis connections */

import Redis from "ioredis";
import env from "./env.config.js";

const redis = new Redis(env.REDIS_URL, {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  reconnectOnError: (error) => {
    console.warn("Redis reconnect on error:", error.message);
    return error.message.includes("READONLY");
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redis.on("ready", () => {
  console.log("✅ Redis ready to receive commands");
});

redis.on("error", (error) => {
  console.error("❌ Redis error:", error.message);
});

redis.on("close", () => {
  console.log("⚠️ Redis connection closed");
});

redis.on("reconnecting", (delay) => {
  console.log(`🔄 Redis reconnecting in ${delay}ms`);
});

const gracefulShutdown = async () => {
  console.log("🛑 Closing Redis connection...");
  await redis.quit();
  console.log("✅ Redis connection closed");
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

export default redis;
/* =====*** Redis configuration initialized ***==== */
