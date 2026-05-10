require('dotenv').config();

const { createClient } = require('redis');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { createServer } = require('http');
const express = require('express');
const cors = require('cors');
const winston = require('winston');

// ── Logger ────────────────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  ),
  transports: [new winston.transports.Console()],
});

// ── Models ────────────────────────────────────────────────────────────────────
const requestLogSchema = new mongoose.Schema({
  type: { type: String, index: true },
  method: String,
  path: String,
  statusCode: Number,
  latencyMs: Number,
  ip: { type: String, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  apiKey: String,
  userAgent: String,
  success: { type: Boolean, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  count: Number,
  limit: Number,
  enqueuedAt: String,
}, { collection: 'requestlogs' });

const RequestLog =
  mongoose.models.RequestLog ||
  mongoose.model('RequestLog', requestLogSchema);

const metricsSnapshotSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  windowSeconds: { type: Number, default: 60 },
  requestsTotal: Number,
  requestsSuccess: Number,
  requestsError: Number,
  requestsPerSecond: Number,
  errorRate: Number,
  avgLatencyMs: Number,
  p50LatencyMs: Number,
  p95LatencyMs: Number,
  p99LatencyMs: Number,
  rateLimitHits: Number,
  uniqueIPs: Number,
});

const MetricsSnapshot =
  mongoose.models.MetricsSnapshot ||
  mongoose.model('MetricsSnapshot', metricsSnapshotSchema);

// ── Sliding Window Metrics ────────────────────────────────────────────────────
const WINDOW_MS = 60 * 1000;
const eventBuffer = [];

function pruneOldEvents() {
  const cutoff = Date.now() - WINDOW_MS;

  while (
    eventBuffer.length > 0 &&
    new Date(eventBuffer[0].timestamp).getTime() < cutoff
  ) {
    eventBuffer.shift();
  }
}

function calculatePercentile(sortedArr, p) {
  if (!sortedArr.length) return 0;

  const idx = Math.ceil((p / 100) * sortedArr.length) - 1;

  return sortedArr[Math.max(0, idx)];
}

function computeMetrics() {
  pruneOldEvents();

  const events = eventBuffer.filter(e => e.type === 'REQUEST');

  const total = events.length;
  const success = events.filter(e => e.success).length;
  const errors = total - success;

  const rateLimitHits = eventBuffer.filter(
    e => e.type === 'RATE_LIMIT_EXCEEDED'
  ).length;

  const latencies = events
    .map(e => e.latencyMs)
    .filter(Boolean)
    .sort((a, b) => a - b);

  const avgLatency = latencies.length
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;

  const uniqueIPs = new Set(
    events.map(e => e.ip).filter(Boolean)
  ).size;

  return {
    timestamp: new Date().toISOString(),
    windowSeconds: WINDOW_MS / 1000,
    requestsTotal: total,
    requestsSuccess: success,
    requestsError: errors,
    requestsPerSecond: parseFloat(
      (total / (WINDOW_MS / 1000)).toFixed(3)
    ),
    errorRate:
      total > 0
        ? parseFloat(((errors / total) * 100).toFixed(2))
        : 0,
    avgLatencyMs: parseFloat(avgLatency.toFixed(2)),
    p50LatencyMs: calculatePercentile(latencies, 50),
    p95LatencyMs: calculatePercentile(latencies, 95),
    p99LatencyMs: calculatePercentile(latencies, 99),
    rateLimitHits,
    uniqueIPs,
  };
}

// ── Express ───────────────────────────────────────────────────────────────────
const app = express();

// IMPORTANT FOR RENDER / VERCEL
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());

// ── HTTP + SOCKET.IO ──────────────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// ── REST API ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'analytics',
    timestamp: new Date().toISOString(),
  });
});

app.get('/metrics/live', (req, res) => {
  res.json({
    success: true,
    data: computeMetrics(),
  });
});

app.get('/metrics/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100');

    const snapshots = await MetricsSnapshot.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: snapshots.reverse(),
    });

  } catch (err) {
    logger.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get('/logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      ip,
      userId,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (ip) filter.ip = ip;
    if (userId) filter.userId = userId;

    if (startDate || endDate) {
      filter.timestamp = {};

      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }

      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      RequestLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),

      RequestLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });

  } catch (err) {
    logger.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get('/logs/abuse', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const logs = await RequestLog.find({
      type: 'RATE_LIMIT_EXCEEDED',
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: logs,
    });

  } catch (err) {
    logger.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ── Socket.IO ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  logger.info(`[Socket.IO] Client connected: ${socket.id}`);

  socket.emit('metrics:snapshot', computeMetrics());

  socket.on('disconnect', () => {
    logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ── Redis Queue Consumer ──────────────────────────────────────────────────────
const QUEUE_KEY = process.env.EVENT_QUEUE_KEY || 'event_queue';

const BATCH_SIZE = parseInt(
  process.env.BATCH_SIZE || '50'
);

const POLL_INTERVAL_MS = parseInt(
  process.env.POLL_INTERVAL_MS || '500'
);

const SNAPSHOT_INTERVAL_MS = parseInt(
  process.env.SNAPSHOT_INTERVAL_MS || '10000'
);

let redisConsumer;
let isShuttingDown = false;

async function processQueue() {
  if (isShuttingDown) return;

  try {
    const pipeline = redisConsumer.multi();

    for (let i = 0; i < BATCH_SIZE; i++) {
      pipeline.lPop(QUEUE_KEY);
    }

    const results = await pipeline.exec();

    const events = results
      .filter(Boolean)
      .map(item => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (events.length > 0) {
      // In-memory metrics
      eventBuffer.push(...events);

      // Persist logs
      try {
        await RequestLog.insertMany(events, {
          ordered: false,
        });

        logger.debug(
          `[Worker] Persisted ${events.length} events`
        );

      } catch (err) {
        if (err.code !== 11000) {
          logger.error(
            '[Worker] Mongo insert error:',
            err.message
          );
        }
      }

      // Live updates
      const metrics = computeMetrics();

      io.emit('metrics:update', metrics);
      io.emit('logs:new', events.slice(-10));
    }

  } catch (err) {
    if (!isShuttingDown) {
      logger.error(
        '[Worker] Queue processing error:',
        err.message
      );
    }
  }
}

// ── Metrics Snapshot ──────────────────────────────────────────────────────────
async function saveMetricsSnapshot() {
  try {
    const metrics = computeMetrics();

    await MetricsSnapshot.create(metrics);

    io.emit('metrics:snapshot', metrics);

    logger.debug('[Worker] Metrics snapshot saved');

  } catch (err) {
    logger.error(
      '[Worker] Snapshot error:',
      err.message
    );
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    logger.info('🚀 Starting Analytics Service...');

    // MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI ||
      'mongodb://localhost:27017/apishield',
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      }
    );

    logger.info('✅ MongoDB connected');

    // Redis
    redisConsumer = createClient({
      url:
        process.env.REDIS_URL ||
        'redis://localhost:6379',

      socket: {
        reconnectStrategy: retries =>
          Math.min(retries * 100, 3000),
      },
    });

    redisConsumer.on('error', (err) => {
      logger.error('❌ Redis error:', err.message);
    });

    await redisConsumer.connect();

    logger.info('✅ Redis connected');

    // Background loops
    const pollLoop = setInterval(
      processQueue,
      POLL_INTERVAL_MS
    );

    const snapshotLoop = setInterval(
      saveMetricsSnapshot,
      SNAPSHOT_INTERVAL_MS
    );

    // Server
    const PORT = process.env.PORT || 3001;

    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(
        `🚀 Analytics Service running on port ${PORT}`
      );

      logger.info(
        '📡 Socket.IO real-time streaming enabled'
      );
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.warn(`⚠️ ${signal} received`);

      isShuttingDown = true;

      clearInterval(pollLoop);
      clearInterval(snapshotLoop);

      try {
        await redisConsumer.quit();
      } catch {}

      try {
        await mongoose.disconnect();
      } catch {}

      httpServer.close(() => {
        logger.info('🛑 Analytics service stopped');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error(
      '❌ Failed to start analytics service:',
      err
    );

    process.exit(1);
  }
}

bootstrap();