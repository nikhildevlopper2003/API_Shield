const mongoose = require('mongoose');

const blockedIPSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: [true, 'IP address is required'],
      unique: true,
      index: true,
      trim: true,
    },
    reason: {
      type: String,
      enum: ['MANUAL', 'RATE_LIMIT_ABUSE', 'SUSPICIOUS_ACTIVITY', 'AUTH_ABUSE'],
      default: 'RATE_LIMIT_ABUSE',
    },
    blockedBy: {
      type: String,
      default: 'system',
    },
    expiresAt: {
      type: Date,
      default: null, // null = permanent
      index: { expireAfterSeconds: 0 },
    },
    violationCount: {
      type: Number,
      default: 1,
    },
    lastViolation: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Static method to check if IP is blocked
blockedIPSchema.statics.checkBlocked = async function (ip) {
  const record = await this.findOne({
    ip,
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  }).lean();
  return !!record;
};

const BlockedIP = mongoose.model('BlockedIP', blockedIPSchema);
module.exports = BlockedIP;
