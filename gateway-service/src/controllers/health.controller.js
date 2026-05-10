const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis');
const { getQueueLength } = require('../services/eventQueue.service');
const logger = require('../utils/logger');

/**
 * healthCheck
 * Returns a detailed health status of all system components.
 */
async function healthCheck(req, res) {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {},
  };

  // MongoDB check
  try {
    const state = mongoose.connection.readyState;
    const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    checks.services.mongodb = {
      status: state === 1 ? 'ok' : 'error',
      state: stateMap[state] || 'unknown',
    };
  } catch (err) {
    checks.services.mongodb = { status: 'error', error: err.message };
    checks.status = 'degraded';
  }

  // Redis check
  try {
    const redis = getRedisClient();
    const pong = await redis.ping();
    const queueDepth = await getQueueLength();
    checks.services.redis = {
      status: pong === 'PONG' ? 'ok' : 'error',
      queueDepth,
    };
  } catch (err) {
    checks.services.redis = { status: 'error', error: err.message };
    checks.status = 'degraded';
  }

  // Memory
  const mem = process.memoryUsage();
  checks.memory = {
    heapUsedMB: (mem.heapUsed / 1024 / 1024).toFixed(2),
    heapTotalMB: (mem.heapTotal / 1024 / 1024).toFixed(2),
    rssMB: (mem.rss / 1024 / 1024).toFixed(2),
  };

  const httpStatus = checks.status === 'ok' ? 200 : 503;
  res.status(httpStatus).json(checks);
}

/**
 * livenessProbe
 * Minimal check for Kubernetes liveness probe.
 */
function livenessProbe(req, res) {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
}

/**
 * readinessProbe
 * Checks if service is ready to accept traffic.
 */
async function readinessProbe(req, res) {
  try {
    const mongoOk = mongoose.connection.readyState === 1;
    const redis = getRedisClient();
    const pong = await redis.ping();
    const redisOk = pong === 'PONG';

    if (mongoOk && redisOk) {
      return res.status(200).json({ status: 'ready' });
    }

    res.status(503).json({
      status: 'not ready',
      mongodb: mongoOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
    });
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
}

module.exports = { healthCheck, livenessProbe, readinessProbe };
