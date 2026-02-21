import { redisClient } from "../config/redis.js";
import { logger } from "../utils/logger.js";
import { QUEUE_NAME } from "../utils/constants.js";
import { detectAbuse } from "../services/detection.service.js";

let isRunning = true;

export const stopConsumer = () => {
  isRunning = false;
};

export const startQueueConsumer = async () => {
  logger.info("Queue consumer started");

  while (isRunning) {
    try {
      const result = await redisClient.brPop(QUEUE_NAME, 0);

      if (!result) continue;

      // ✅ FIXED HERE
      const rawEvent = result.element;

      let event;
      try {
        event = JSON.parse(rawEvent);
      } catch (parseError) {
        logger.error("Invalid JSON event received", { rawEvent });
        continue;
      }

      await processEvent(event);

    } catch (error) {
      logger.error("Queue consumption error", error);
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  logger.info("Queue consumer stopped");
};

const processEvent = async (event) => {
  try {
    await detectAbuse(event);
  } catch (error) {
    logger.error("Event processing failed", {
      event,
      error: error.message
    });
  }
};