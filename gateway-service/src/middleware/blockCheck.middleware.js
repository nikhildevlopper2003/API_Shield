const { isIPBlocked } = require('../services/block.service');
const logger = require('../utils/logger');

/**
 * blockCheckMiddleware
 * Checks if the requesting IP is in the blocked list.
 * Blocked IPs receive a 403 response immediately.
 */
async function blockCheckMiddleware(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;

  try {
    const blocked = await isIPBlocked(clientIP);

    if (blocked) {
      logger.warn(`[BlockCheck] Blocked IP attempted access: ${clientIP}`);
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Your IP address has been blocked due to abuse',
        ip: clientIP,
      });
    }

    req.clientIP = clientIP;
    next();
  } catch (error) {
    logger.error('[BlockCheck] Error checking blocked status:', error);
    // Fail open — allow request if block check errors out
    next();
  }
}

module.exports = { blockCheckMiddleware };
