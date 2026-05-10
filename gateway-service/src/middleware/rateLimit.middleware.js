const { checkRateLimit } = require('../services/rateLimit.service');
const { pushEvent } = require('../services/eventQueue.service');
const logger = require('../utils/logger');

/**
 * rateLimitMiddleware
 * Implements a Redis-based sliding window rate limiter.
 * Uses the user's associated RatePolicy for limits.
 * Automatically blocks IPs that consistently exceed limits.
 */
async function rateLimitMiddleware(req, res, next) {
  const { user, clientIP } = req;

  if (!user) {
    return next();
  }

  try {
    const result = await checkRateLimit(user, clientIP);

    // Attach rate limit headers to every response
    res.setHeader('X-RateLimit-Limit', result.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
    res.setHeader('X-RateLimit-Reset', result.resetTime);
    res.setHeader('X-RateLimit-Window', result.windowSeconds);

    if (result.exceeded) {
      logger.warn(`[RateLimit] Exceeded — User: ${user.email}, IP: ${clientIP}, Count: ${result.count}/${result.limit}`);

      // Push rate limit event to analytics queue
      await pushEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        userId: user._id,
        apiKey: req.apiKey,
        ip: clientIP,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        count: result.count,
        limit: result.limit,
      });

      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Limit: ${result.limit} requests per ${result.windowSeconds}s`,
        retryAfter: result.retryAfter,
        limit: result.limit,
        remaining: 0,
        resetTime: result.resetTime,
      });
    }

    logger.debug(`[RateLimit] OK — User: ${user.email}, ${result.remaining} requests remaining`);
    next();
  } catch (error) {
    logger.error('[RateLimit] Error during rate limit check:', error);
    // Fail open on rate limit errors
    next();
  }
}

module.exports = { rateLimitMiddleware };
