import { redisClient } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import {
  BLOCK_DURATION_SECONDS,
  BLOCK_PREFIX
} from "../utils/constants.js";
import { BlockedIP } from "../models/BlockedIP.js";

export const isAlreadyBlocked = async (ip) => {
  const existing = await redisClient.get(`${BLOCK_PREFIX}${ip}`);
  return !!existing;
};

export const blockIP = async (ip) => {
  try {
    // Set Redis block
    await redisClient.set(
      `${BLOCK_PREFIX}${ip}`,
      "1",
      { EX: BLOCK_DURATION_SECONDS }
    );

    // Persist in Mongo
    await BlockedIP.findOneAndUpdate(
      { ip },
      {
        ip,
        blockedUntil: new Date(Date.now() + BLOCK_DURATION_SECONDS * 1000)
      },
      { upsert: true }
    );

    logger.warn(`IP ${ip} blocked for ${BLOCK_DURATION_SECONDS} seconds`);

  } catch (error) {
    logger.error("Failed to block IP", {
      ip,
      error: error.message
    });
  }
};
