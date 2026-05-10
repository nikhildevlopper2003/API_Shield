const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const QUEUE_KEY = process.env.EVENT_QUEUE_KEY || 'event_queue';
const MAX_QUEUE_SIZE = parseInt(process.env.MAX_QUEUE_SIZE || '100000');

/**
 * pushEvent
 * Pushes a serialized event object to the Redis list queue.
 * Uses RPUSH to enqueue (analytics service LPOPs).
 *
 * @param {Object} event - Event payload
 */
async function pushEvent(event) {
  const redis = getRedisClient();

  try {
    // Check queue size to prevent unbounded growth
    const queueSize = await redis.lLen(QUEUE_KEY);
    if (queueSize >= MAX_QUEUE_SIZE) {
      logger.warn(`[EventQueue] Queue full (${queueSize}/${MAX_QUEUE_SIZE}). Dropping event.`);
      return false;
    }

    const payload = JSON.stringify({
      ...event,
      enqueuedAt: new Date().toISOString(),
    });

    await redis.rPush(QUEUE_KEY, payload);
    logger.debug(`[EventQueue] Event pushed: ${event.type} (queue size: ~${queueSize + 1})`);
    return true;
  } catch (error) {
    logger.error('[EventQueue] Failed to push event:', error.message);
    return false;
  }
}

/**
 * getQueueLength
 * Returns current queue depth.
 */
async function getQueueLength() {
  const redis = getRedisClient();
  return redis.lLen(QUEUE_KEY);
}

/**
 * peekQueue
 * Returns the first N items from queue without removing.
 */
async function peekQueue(count = 10) {
  const redis = getRedisClient();
  const items = await redis.lRange(QUEUE_KEY, 0, count - 1);
  return items.map((item) => {
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  });
}

module.exports = { pushEvent, getQueueLength, peekQueue };
