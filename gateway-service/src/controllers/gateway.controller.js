const { pushEvent } = require('../services/eventQueue.service');
const logger = require('../utils/logger');

/**
 * proxyRequest
 * The main gateway handler. After passing through the middleware chain
 * (auth → blockCheck → rateLimit → latency), this proxies to a target
 * or returns a mock response for demonstration.
 */
async function proxyRequest(req, res, next) {
  try {
    const targetUrl = req.headers['x-target-url'] || process.env.DEFAULT_TARGET_URL;

    if (!targetUrl) {
      // Demo mode: echo back request info
      return res.json({
        success: true,
        message: 'Request passed all gateway checks',
        gateway: {
          user: {
            id: req.user._id,
            email: req.user.email,
            name: req.user.name,
          },
          request: {
            method: req.method,
            path: req.originalUrl,
            ip: req.clientIP,
            timestamp: new Date().toISOString(),
          },
          rateLimit: {
            limit: res.getHeader('X-RateLimit-Limit'),
            remaining: res.getHeader('X-RateLimit-Remaining'),
            reset: res.getHeader('X-RateLimit-Reset'),
          },
        },
      });
    }

    // Proxy to upstream target
    const { default: fetch } = await import('node-fetch');
    const upstreamRes = await fetch(targetUrl + req.path, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': req.clientIP,
        'X-Gateway-User': req.user._id.toString(),
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      timeout: parseInt(process.env.PROXY_TIMEOUT_MS || '10000'),
    });

    const data = await upstreamRes.json();
    res.status(upstreamRes.status).json(data);

  } catch (err) {
    logger.error('[Gateway] Proxy error:', err.message);
    next(err);
  }
}

/**
 * pingGateway
 * Simple authenticated ping endpoint.
 */
function pingGateway(req, res) {
  res.json({
    success: true,
    message: 'pong',
    user: req.user?.email,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { proxyRequest, pingGateway };
