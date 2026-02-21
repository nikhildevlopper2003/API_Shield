import { redisClient } from "../config/redis.js";

export const pushEvent = async (event) => {
  const key = "event_queue";

  await redisClient.rPush(
    key,
    JSON.stringify(event)
  );
};
