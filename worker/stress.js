// stress.js
import { createClient } from "redis";

const redis = createClient({
  url: "redis_url"
});

await redis.connect();

console.log("Connected to Upstash");

for (let i = 0; i < 120; i++) {
  await redis.lPush("event_queue", JSON.stringify({
  ip: "2.2.2.2",
  userId: "507f1f77bcf86cd799439011",
  endpoint: "/login"
}));
}

console.log("120 events pushed");
await redis.quit();
process.exit();
