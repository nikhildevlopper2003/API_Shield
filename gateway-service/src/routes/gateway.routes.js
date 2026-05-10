const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth.middleware');
const { blockCheckMiddleware } = require('../middleware/blockCheck.middleware');
const { rateLimitMiddleware } = require('../middleware/rateLimit.middleware');
const { proxyRequest, pingGateway } = require('../controllers/gateway.controller');

// Full middleware chain: auth → blockCheck → rateLimit → handler
const gatewayPipeline = [authMiddleware, blockCheckMiddleware, rateLimitMiddleware];

// Ping (authenticated)
router.get('/ping', gatewayPipeline, pingGateway);

// All methods — proxy/echo endpoint
router.all('/proxy', gatewayPipeline, proxyRequest);
router.all('/proxy/*', gatewayPipeline, proxyRequest);

// Catch-all gateway route
router.all('*', gatewayPipeline, proxyRequest);

module.exports = router;
