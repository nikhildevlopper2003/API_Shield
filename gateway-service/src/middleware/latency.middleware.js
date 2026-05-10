const { pushEvent } = require('../services/eventQueue.service');
const logger = require('../utils/logger');

/**
 * requestLatencyMiddleware
 * Attaches a high-resolution timer to each request.
 * On response finish, calculates latency and pushes a log event.
 */
function requestLatencyMiddleware(req, res, next) {
  req.startTime = process.hrtime.bigint();
  req.startTimeMs = Date.now();

  res.on('finish', async () => {
    const endTime = process.hrtime.bigint();
    const latencyNs = endTime - req.startTime;
    const latencyMs = Number(latencyNs) / 1_000_000;

    const event = {
      type: 'REQUEST',
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      latencyMs: parseFloat(latencyMs.toFixed(3)),
      ip: req.clientIP || req.ip,
      userId: req.user?._id || null,
      apiKey: req.apiKey || null,
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(req.startTimeMs).toISOString(),
      success: res.statusCode < 400,
    };

    try {
      await pushEvent(event);
    } catch (err) {
      logger.error('[Latency] Failed to push event:', err.message);
    }

    logger.debug(
      `[${req.method}] ${req.originalUrl} → ${res.statusCode} (${latencyMs.toFixed(2)}ms)`
    );
  });

  next();
}

module.exports = { requestLatencyMiddleware };
