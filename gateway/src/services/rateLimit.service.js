import { redisClient } from "../config/redis.js";
import { User } from "../models/User.js";

export const checkRateLimit = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const windowSize = 60; // 60 seconds window
  const maxRequests = user.rateLimit;

  const key = `rl:${userId}`;
  const now = Date.now();
  const windowStart = now - windowSize * 1000;

  //Remove requests older than window
  await redisClient.zRemRangeByScore(key, 0, windowStart);

  //Count remaining requests
  const requestCount = await redisClient.zCard(key);
  console.log("User rateLimit:", maxRequests);
console.log("Current count:", requestCount);

  if (requestCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  //Add current request
  await redisClient.zAdd(key, [
    { score: now, value: now.toString() }
  ]);

  // Set expiry (avoid memory leak)
  await redisClient.expire(key, windowSize);

  return {
    allowed: true,
    remaining: maxRequests - requestCount - 1
  };
};
