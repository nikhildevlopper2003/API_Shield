const { getRedisClient } = require('../config/redis');
const BlockedIP = require('../models/BlockedIP.model');
const logger = require('../utils/logger');

const BLOCK_CACHE_PREFIX = 'blocked:';
const BLOCK_CACHE_TTL = 300; // 5 minutes cache

/**
 * isIPBlocked
 * First checks Redis cache, then falls back to MongoDB.
 * Caches positive results for performance.
 *
 * @param {string} ip - IP address to check
 * @returns {boolean}
 */
async function isIPBlocked(ip) {
  const redis = getRedisClient();
  const cacheKey = `${BLOCK_CACHE_PREFIX}${ip}`;

  try {
    // Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached === '1';
    }

    // Fall back to MongoDB
    const isBlocked = await BlockedIP.checkBlocked(ip);

    // Cache the result
    await redis.setEx(cacheKey, BLOCK_CACHE_TTL, isBlocked ? '1' : '0');

    return isBlocked;
  } catch (error) {
    logger.error('[Block] Error checking IP block status:', error);
    return false; // Fail open
  }
}

/**
 * autoBlockIP
 * Blocks an IP automatically due to abuse.
 * Stores in MongoDB and invalidates Redis cache.
 *
 * @param {string} ip
 * @param {string} reason
 * @param {number} violationCount
 * @param {number|null} durationHours - null = permanent
 */
async function autoBlockIP(ip, reason = 'RATE_LIMIT_ABUSE', violationCount = 1, durationHours = 24) {
  const redis = getRedisClient();

  try {
    const expiresAt = durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    await BlockedIP.findOneAndUpdate(
      { ip },
      {
        ip,
        reason,
        blockedBy: 'system',
        expiresAt,
        violationCount,
        lastViolation: new Date(),
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Invalidate cache
    await redis.setEx(`${BLOCK_CACHE_PREFIX}${ip}`, BLOCK_CACHE_TTL, '1');

    logger.info(`[Block] Auto-blocked IP: ${ip}, reason: ${reason}, expires: ${expiresAt || 'never'}`);
  } catch (error) {
    logger.error('[Block] Failed to auto-block IP:', error);
  }
}

/**
 * manualBlockIP
 * Admin-triggered block of an IP address.
 */
async function manualBlockIP(ip, reason = 'MANUAL', notes = '', blockedBy = 'admin', durationHours = null) {
  const redis = getRedisClient();

  const expiresAt = durationHours
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
    : null;

  const record = await BlockedIP.findOneAndUpdate(
    { ip },
    { ip, reason, notes, blockedBy, expiresAt, isActive: true },
    { upsert: true, new: true }
  );

  await redis.setEx(`${BLOCK_CACHE_PREFIX}${ip}`, BLOCK_CACHE_TTL, '1');

  logger.info(`[Block] Manual block — IP: ${ip}, by: ${blockedBy}`);
  return record;
}

/**
 * unblockIP
 * Removes an IP from the block list.
 */
async function unblockIP(ip) {
  const redis = getRedisClient();

  await BlockedIP.findOneAndUpdate({ ip }, { isActive: false });
  await redis.del(`${BLOCK_CACHE_PREFIX}${ip}`);

  logger.info(`[Block] Unblocked IP: ${ip}`);
}

/**
 * getBlockedIPs
 * Returns all currently active blocked IPs.
 */
async function getBlockedIPs(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const query = {
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  };

  const [items, total] = await Promise.all([
    BlockedIP.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    BlockedIP.countDocuments(query),
  ]);

  return { items, total, page, pages: Math.ceil(total / limit) };
}

module.exports = { isIPBlocked, autoBlockIP, manualBlockIP, unblockIP, getBlockedIPs };
