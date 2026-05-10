const { getRedisClient } = require('../config/redis');
const RatePolicy = require('../models/RatePolicy.model');
const { autoBlockIP } = require('./block.service');
const logger = require('../utils/logger');

// Default policy fallback
const DEFAULT_POLICY = {
  requestsPerWindow: parseInt(process.env.DEFAULT_RATE_LIMIT || '100'),
  windowSeconds: parseInt(process.env.DEFAULT_WINDOW_SECONDS || '60'),
  violationsBeforeBlock: 5,
};

/**
 * checkRateLimit
 * Implements a Redis sliding window counter rate limiter.
 * Uses INCR + EXPIRE pattern for atomic increments.
 *
 * @param {Object} user - Authenticated user document
 * @param {string} clientIP - Client IP address
 * @returns {Object} Rate limit result
 */
async function checkRateLimit(user, clientIP) {
  const redis = getRedisClient();

  // Resolve policy: user-specific > default
  let policy = DEFAULT_POLICY;
  if (user.ratePolicyId) {
    try {
      const dbPolicy = await RatePolicy.findById(user.ratePolicyId).lean();
      if (dbPolicy) policy = dbPolicy;
    } catch (err) {
      logger.warn('[RateLimit] Failed to fetch policy, using default:', err.message);
    }
  }

  const { requestsPerWindow: limit, windowSeconds, violationsBeforeBlock } = policy;

  // Key format: rl:{userId}:{windowStart}
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `rl:${user._id}:${windowStart}`;
  const violationKey = `rlv:${user._id}:${clientIP}`;

  try {
    // Atomic increment
    const count = await redis.incr(key);

    // Set TTL on first request in window
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    const remaining = limit - count;
    const resetTime = (windowStart + 1) * windowSeconds * 1000;
    const exceeded = count > limit;

    if (exceeded) {
      // Track violations for auto-block
      const violations = await redis.incr(violationKey);
      if (violations === 1) {
        await redis.expire(violationKey, windowSeconds * 10);
      }

      if (violations >= violationsBeforeBlock) {
        logger.warn(`[RateLimit] Auto-blocking IP ${clientIP} after ${violations} violations`);
        await autoBlockIP(clientIP, 'RATE_LIMIT_ABUSE', violations);
        await redis.del(violationKey);
      }
    }

    return {
      exceeded,
      count,
      limit,
      remaining,
      windowSeconds,
      resetTime: new Date(resetTime).toISOString(),
      retryAfter: exceeded ? Math.ceil(resetTime / 1000 - Date.now() / 1000) : 0,
    };
  } catch (error) {
    logger.error('[RateLimit] Redis operation failed:', error);
    // Fail open with permissive response
    return {
      exceeded: false,
      count: 0,
      limit,
      remaining: limit,
      windowSeconds,
      resetTime: new Date().toISOString(),
      retryAfter: 0,
    };
  }
}

module.exports = { checkRateLimit };
