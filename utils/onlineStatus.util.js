import { redis } from "../config/redis.config.js";

// ====*** Redis Online Status Constants ***=====

export const ONLINE_STATUS_TTL_SECONDS = 300;
export const ONLINE_STATUS_REFRESH_INTERVAL_MS = 60 * 1000;

// ====*** Redis Online Status Key Helpers ***=====

/**
 * Build the Redis online key for a user.
 * @param {string} userId
 * @returns {string}
 */
export const getOnlineKey = (userId) => `online:${userId}`;

/**
 * Build the Redis last seen key for a user.
 * @param {string} userId
 * @returns {string}
 */
export const getLastSeenKey = (userId) => `lastseen:${userId}`;

/**
 * Build the Redis socket key for a user.
 * @param {string} userId
 * @returns {string}
 */
export const getUserSocketKey = (userId) => `user_socket:${userId}`;

// ====*** Set User Online ***=====

/**
 * Mark a user online in Redis.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export const setUserOnline = async (userId) => {
  await redis.set(getOnlineKey(userId), "1", "EX", ONLINE_STATUS_TTL_SECONDS);
};

// ====*** Set User Offline ***=====

/**
 * Mark a user offline and persist last seen in Redis.
 * This key is intentionally stored without TTL because "last seen" must survive restarts.
 * @param {string} userId
 * @returns {Promise<string>}
 */
export const setUserOffline = async (userId) => {
  const lastSeen = new Date().toISOString();

  await redis
    .multi()
    .del(getOnlineKey(userId))
    .set(getLastSeenKey(userId), lastSeen)
    .del(getUserSocketKey(userId))
    .exec();

  return lastSeen;
};

// ====*** Refresh Online TTL ***=====

/**
 * Refresh the online status TTL for a connected user.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export const refreshUserOnlineTTL = async (userId) => {
  await redis.expire(getOnlineKey(userId), ONLINE_STATUS_TTL_SECONDS);
  await redis.expire(getUserSocketKey(userId), ONLINE_STATUS_TTL_SECONDS);
};

// ====*** Set User Socket Mapping ***=====

/**
 * Store the active socket id for a user.
 * @param {string} userId
 * @param {string} socketId
 * @returns {Promise<void>}
 */
export const setUserSocketId = async (userId, socketId) => {
  await redis.set(
    getUserSocketKey(userId),
    socketId,
    "EX",
    ONLINE_STATUS_TTL_SECONDS
  );
};

// ====*** Remove User Socket Mapping ***=====

/**
 * Remove the active socket mapping for a user.
 * @param {string} userId
 * @returns {Promise<void>}
 */
export const removeUserSocketId = async (userId) => {
  await redis.del(getUserSocketKey(userId));
};

// ====*** Get User Socket Mapping ***=====

/**
 * Get the active socket id for a user.
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
export const getUserSocketId = async (userId) =>
  redis.get(getUserSocketKey(userId));

// ====*** Get User Online Status ***=====

/**
 * Read the online status and last seen for a user.
 * @param {string} userId
 * @returns {Promise<{isOnline: boolean, lastSeen: string | null}>}
 */
export const getUserOnlineStatus = async (userId) => {
  const [onlineValue, lastSeen] = await Promise.all([
    redis.get(getOnlineKey(userId)),
    redis.get(getLastSeenKey(userId)),
  ]);

  return {
    isOnline: Boolean(onlineValue),
    lastSeen,
  };
};

// ====*** Get Bulk Online Status ***=====

/**
 * Read online status for many users.
 * @param {string[]} userIds
 * @returns {Promise<Record<string, {isOnline: boolean, lastSeen: string | null}>>}
 */
export const getBulkOnlineStatus = async (userIds) => {
  const results = await Promise.all(
    userIds.map(async (userId) => [userId, await getUserOnlineStatus(userId)])
  );

  return Object.fromEntries(results);
};
