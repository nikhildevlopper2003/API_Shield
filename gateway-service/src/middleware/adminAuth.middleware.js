const User = require('../models/User.model');
const logger = require('../utils/logger');

async function adminAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-admin-key'];

  // Allow internal secret key for service-to-service
  if (apiKey === process.env.ADMIN_SECRET_KEY) {
    req.user = { role: 'admin', email: 'system' };
    return next();
  }

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Admin key required' });
  }

  try {
    const user = await User.findOne({ apiKey, isActive: true, role: 'admin' }).lean();
    if (!user) {
      logger.warn(`[AdminAuth] Unauthorized admin access attempt from IP: ${req.ip}`);
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = adminAuth;
