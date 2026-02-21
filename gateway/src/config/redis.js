import { createClient } from "redis";
import { config } from "./env.js";

export const redisClient = createClient({
  url: config.redisUrl
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected successfully");
  } catch (error) {
    console.error("Redis connection failed:", error.message);
    process.exit(1);
  }
};

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});
