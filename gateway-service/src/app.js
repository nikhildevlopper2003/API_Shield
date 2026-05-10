const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');

const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const gatewayRoutes = require('./routes/gateway.routes');
const adminRoutes = require('./routes/admin.routes');
const healthRoutes = require('./routes/health.routes');
const { requestLatencyMiddleware } = require('./middleware/latency.middleware');

const app = express();
const httpServer = createServer(app);

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Latency tracking (attaches start time to every request)
app.use(requestLatencyMiddleware);

// Routes
app.use('/health', healthRoutes);
app.use('/admin', adminRoutes);
app.use('/gateway', gatewayRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({
    service: 'APIShield Pro - Gateway Service',
    version: process.env.npm_package_version || '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app, httpServer };
