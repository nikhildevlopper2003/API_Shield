const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name too long'],
    },

    // 🔥 FIXED: keep unique but reliable
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    ratePolicyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RatePolicy',
      default: null,
    },

    requestCount: {
      type: Number,
      default: 0,
    },

    lastSeen: {
      type: Date,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


// 🔥 IMPORTANT: Only generate if missing (safe)
userSchema.pre('save', function (next) {
  if (!this.apiKey) {
    this.apiKey = `ask_${crypto.randomBytes(24).toString('hex')}`;
  }
  next();
});


// 🔄 Regenerate API key safely
userSchema.methods.regenerateApiKey = async function () {
  this.apiKey = `ask_${crypto.randomBytes(24).toString('hex')}`;
  return this.save();
};


// 🔍 Find by API key
userSchema.statics.findByApiKey = function (apiKey) {
  return this.findOne({ apiKey, isActive: true });
};


const User = mongoose.model('User', userSchema);

module.exports = User;