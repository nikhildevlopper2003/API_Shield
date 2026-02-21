import { redisClient } from "../config/redis.js";
import { BlockedIP } from "../models/BlockedIP.js";

export const isBlocked = async (ip) => {
  const key = `blocked:${ip}`;
  const blocked = await redisClient.get(key);
  return blocked !== null;
};

export const blockIP = async (ip, duration = 300) => {
  const key = `blocked:${ip}`;

  // Save in Redis for fast check
  await redisClient.set(key, "1", {
    EX: duration
  });

  // Save in Mongo for audit
  await BlockedIP.findOneAndUpdate(
    { ip },
    {
      ip,
      blockedUntil: new Date(Date.now() + duration * 1000)
    },
    { upsert: true }
  );
};
