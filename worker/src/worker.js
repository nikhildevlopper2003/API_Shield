import { connectDB } from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import { logger } from "./utils/logger.js";
import { startQueueConsumer, stopConsumer } from "./queue/consumer.js";

const startWorker = async () => {
  try {
    await connectDB();
    await connectRedis();

    logger.info("Worker fully initialized");

    await startQueueConsumer();

  } catch (error) {
    logger.error("Worker startup failed", error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Graceful shutdown initiated");
  stopConsumer();
  process.exit(0);
});

startWorker();
