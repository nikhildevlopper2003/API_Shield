import app from "./app.js";
import { config } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { connectRedis, redisClient } from "./config/redis.js";

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down server...");
      await redisClient.quit();
      server.close(() => {
        process.exit(0);
      });
    });

  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
};

startServer();
