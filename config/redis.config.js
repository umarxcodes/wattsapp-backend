import Redis from "ioredis";
import { env } from "./env.config.js";

// ====*** Redis Client Configuration ***=====

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableAutoPipelining: true,
  retryStrategy: (times) => Math.min(times * 200, 2000),
  reconnectOnError: (error) => error.message.includes("READONLY"),
});

// ====*** Connect Redis ***=====

export const connectRedis = async () => {
  if (redis.status === "ready" || redis.status === "connecting") {
    return redis;
  }

  await redis.connect();
  return redis;
};

// ====*** Disconnect Redis ***=====

export const disconnectRedis = async () => {
  if (redis.status === "ready" || redis.status === "connecting") {
    await redis.quit();
  }
};

// ====*** Redis Event Logging ***=====

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("ready", () => {
  console.log("Redis ready");
});

redis.on("error", (error) => {
  console.error("Redis error:", error.message);
});
