import { createClient } from "redis";
import { config } from "./env.js";
import { logger } from "../utils/logger.js";

export const redisClient = createClient({
  url: config.redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error("Redis reconnect failed too many times");
        return new Error("Retry limit reached");
      }
      return retries * 100;
    }
  }
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info("Worker Redis connected");
  } catch (error) {
    logger.error("Redis connection failed", error);
    process.exit(1);
  }
};

redisClient.on("error", (err) => {
  logger.error("Redis error", err);
});
