import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({
  path: path.resolve(__dirname, "../../../.env")
});

const requiredEnvVars = [
  "PORT",
  "MONGO_URI",
  "REDIS_URL"
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required env variable: ${key}`);
    process.exit(1);
  }
});

export const config = {
  port: process.env.PORT,
  mongoUri: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,
  nodeEnv: process.env.NODE_ENV || "development",
  blockDuration: parseInt(process.env.BLOCK_DURATION_SECONDS) || 300
};