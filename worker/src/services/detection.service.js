import { AbuseLog } from "../models/AbuseLog.js";
import { blockIP } from "./block.service.js";
import { redisClient } from "../config/redis.js";
export const detectAbuse = async (event) => {
  const { ip, userId, endpoint } = event;

  const ABUSE_THRESHOLD = 100;
  const ABUSE_WINDOW = 60 * 1000;

  const key = `ip_activity:${ip}`;
  const now = Date.now();
  const windowStart = now - ABUSE_WINDOW;

  await redisClient.zRemRangeByScore(key, 0, windowStart);

  const count = await redisClient.zCard(key);

  if (count >= ABUSE_THRESHOLD) {
    await AbuseLog.create({
      ip,
      userId,
      endpoint,
      reason: "Abuse threshold exceeded"
    });

    await blockIP(ip, 3600);
    return;
  }

  await redisClient.zAdd(key, [
    { score: now, value: now.toString() }
  ]);

  await redisClient.expire(key, 60);
};