const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

async function connectRedis() {
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('❌ Redis max reconnection attempts reached');
          return new Error('Max retries reached');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on('error', (err) => logger.error('❌ Redis error:', err));
  redisClient.on('reconnecting', () => logger.warn('⚠️  Redis reconnecting...'));
  redisClient.on('ready', () => logger.info('✅ Redis ready'));

  await redisClient.connect();
  return redisClient;
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = { connectRedis, getRedisClient, disconnectRedis };
