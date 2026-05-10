const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['REQUEST', 'RATE_LIMIT_EXCEEDED', 'AUTH_FAILURE', 'BLOCK_HIT'],
      default: 'REQUEST',
      index: true,
    },
    method: { type: String, uppercase: true },
    path: { type: String },
    statusCode: { type: Number, index: true },
    latencyMs: { type: Number },
    ip: { type: String, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    apiKey: { type: String, default: null },
    userAgent: { type: String },
    success: { type: Boolean, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    // Rate limit specific
    count: { type: Number },
    limit: { type: Number },
  },
  {
    timeseries: {
      timeField: 'timestamp',
      granularity: 'seconds',
    },
    expireAfterSeconds: 60 * 60 * 24 * 30, // 30 days
  }
);

const RequestLog = mongoose.model('RequestLog', requestLogSchema);
module.exports = RequestLog;
