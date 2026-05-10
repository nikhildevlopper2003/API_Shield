const User = require('../models/User.model');
const RatePolicy = require('../models/RatePolicy.model');
const BlockedIP = require('../models/BlockedIP.model');

const {
  manualBlockIP,
  unblockIP,
  getBlockedIPs
} = require('../services/block.service');

const { getQueueLength } = require('../services/eventQueue.service');
const { redisClient } = require('../config/redis'); // 🔥 ADDED

const logger = require('../utils/logger');


// ─────────────────────────────────────────────────────────────
// 👤 USER MANAGEMENT
// ─────────────────────────────────────────────────────────────

async function createUser(req, res, next) {
  try {
    const { email, name, role, ratePolicyId } = req.body;
    const user = new User({ email, name, role, ratePolicyId });
    await user.save();

    logger.info(`[Admin] Created user: ${email}`);

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('ratePolicyId', 'name requestsPerWindow windowSeconds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const user = await User.findById(req.params.id)
      .populate('ratePolicyId')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { name, isActive, ratePolicyId, role } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, isActive, ratePolicyId, role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function regenerateApiKey(req, res, next) {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await user.regenerateApiKey();

    logger.info(`[Admin] API key regenerated for user: ${user.email}`);

    res.json({
      success: true,
      data: { apiKey: user.apiKey, userId: user._id },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
}


// ─────────────────────────────────────────────────────────────
// 📊 RATE POLICY MANAGEMENT
// ─────────────────────────────────────────────────────────────

async function createRatePolicy(req, res, next) {
  try {
    const policy = new RatePolicy(req.body);
    await policy.save();

    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
}

async function listRatePolicies(req, res, next) {
  try {
    const policies = await RatePolicy.find().sort({ createdAt: -1 }).lean();

    res.json({ success: true, data: policies });
  } catch (err) {
    next(err);
  }
}

async function updateRatePolicy(req, res, next) {
  try {
    const policy = await RatePolicy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
}

async function deleteRatePolicy(req, res, next) {
  try {
    await RatePolicy.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Policy deleted' });
  } catch (err) {
    next(err);
  }
}


// ─────────────────────────────────────────────────────────────
// 🚫 IP BLOCK MANAGEMENT (FIXED)
// ─────────────────────────────────────────────────────────────

async function listBlockedIPs(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;

    const result = await getBlockedIPs(parseInt(page), parseInt(limit));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function blockIP(req, res, next) {
  try {
    const { ip, reason, notes, durationHours } = req.body;

    const record = await manualBlockIP(
      ip,
      reason,
      notes,
      'admin',
      durationHours
    );

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}


// 🔥 FIXED SINGLE UNBLOCK
async function unblockIPController(req, res, next) {
  try {
    const ip = req.params.ip;

    await unblockIP(ip);

    // 🔥 CRITICAL FIX
    await redisClient.del(`blocked:${ip}`);

    logger.info(`[Admin] IP unblocked: ${ip}`);

    res.json({
      success: true,
      message: `IP ${ip} unblocked`,
    });
  } catch (err) {
    next(err);
  }
}


// 🔥 FIXED UNBLOCK ALL
async function unblockAllIPsController(req, res, next) {
  try {
    const blockedIPs = await BlockedIP.find({}, { ip: 1 });

    await BlockedIP.deleteMany({});

    const keys = blockedIPs.map(b => `blocked:${b.ip}`);
    if (keys.length) {
      await redisClient.del(...keys);
    }

    logger.info('[Admin] All IPs unblocked');

    res.json({
      success: true,
      message: 'All IPs unblocked',
    });
  } catch (err) {
    next(err);
  }
}


// ─────────────────────────────────────────────────────────────
// ⚙️ SYSTEM INFO
// ─────────────────────────────────────────────────────────────

async function getSystemStats(req, res, next) {
  try {
    const [userCount, policyCount, queueLength] = await Promise.all([
      User.countDocuments({ isActive: true }),
      RatePolicy.countDocuments(),
      getQueueLength(),
    ]);

    res.json({
      success: true,
      data: {
        activeUsers: userCount,
        ratePolicies: policyCount,
        queueDepth: queueLength,
        uptime: process.uptime(),
        memoryMB: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        nodeVersion: process.version,
      },
    });
  } catch (err) {
    next(err);
  }
}


// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  regenerateApiKey,
  deleteUser,

  createRatePolicy,
  listRatePolicies,
  updateRatePolicy,
  deleteRatePolicy,

  listBlockedIPs,
  blockIP,
  unblockIPController,
  unblockAllIPsController,

  getSystemStats,
};