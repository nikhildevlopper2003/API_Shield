const User = require('../models/User.model');
const logger = require('../utils/logger');

/**
 * authMiddleware
 * Validates the incoming API key from the `x-api-key` header.
 * Attaches the matched user to req.user on success.
 */
async function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn(`[Auth] Missing API key — IP: ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing x-api-key header',
    });
  }

  try {
    const user = await User.findOne({ apiKey, isActive: true }).lean();

    if (!user) {
      logger.warn(`[Auth] Invalid API key attempted — IP: ${req.ip}, Key: ${apiKey.slice(0, 8)}...`);
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Invalid or revoked API key',
      });
    }

    // Attach user to request context
    req.user = user;
    req.apiKey = apiKey;

    logger.debug(`[Auth] Authenticated user: ${user.email} — IP: ${req.ip}`);
    next();
  } catch (error) {
    logger.error('[Auth] Error during authentication:', error);
    next(error);
  }
}

module.exports = { authMiddleware };
