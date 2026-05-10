require('dotenv').config();
const { httpServer } = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✅ MongoDB connected');

    // Connect to Redis
    await connectRedis();
    logger.info('✅ Redis connected');

    logger.info('✅ Event queue ready');

    // Start HTTP server
    httpServer.listen(PORT, HOST, () => {
      logger.info(`🚀 Gateway Service running on http://${HOST}:${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`⚠️  Received ${signal}. Shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('🛑 HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('⛔ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
