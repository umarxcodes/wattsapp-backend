/* Redis client configuration with retry handling and graceful shutdown */

import Redis from "ioredis";
import env from "./env.config.js";

/* Initialize Redis client with production-ready connection options */
const redis = new Redis(env.REDIS_URL, {
  /* Delay before retrying during Redis failover */
  retryDelayOnFailover: 100,

  /* Maximum retry attempts per failed request */
  maxRetriesPerRequest: 3,

  /* Prevent automatic connection until explicitly needed */
  lazyConnect: true,

  /* Reconnect only for specific recoverable Redis errors */
  reconnectOnError: (error) => {
    console.warn("Redis reconnect on error:", error.message);

    return error.message.includes("READONLY");
  },
});

/* Listen when Redis connection is successfully established */
redis.on("connect", () => {
  console.log("Redis connected successfully");
});

/* Listen when Redis is fully ready to process commands */
redis.on("ready", () => {
  console.log("Redis ready to receive commands");
});

/* Handle runtime Redis connection errors */
redis.on("error", (error) => {
  console.error("Redis error:", error.message);
});

/* Listen when Redis connection is closed */
redis.on("close", () => {
  console.log("Redis connection closed");
});

/* Track automatic Redis reconnection attempts */
redis.on("reconnecting", (delay) => {
  console.log(`Redis reconnecting in ${delay}ms`);
});

/* Close Redis connection safely before application shutdown */
const gracefulShutdown = async () => {
  console.log("Closing Redis connection...");

  await redis.quit();

  console.log("Redis connection closed successfully");
};

/* Handle manual process termination */
process.on("SIGINT", gracefulShutdown);

/* Handle production/server termination signals */
process.on("SIGTERM", gracefulShutdown);

export default redis;
