const mongoose = require('mongoose');

const ratePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Policy name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    requestsPerWindow: {
      type: Number,
      required: true,
      min: [1, 'Must allow at least 1 request'],
      default: 100,
    },
    windowSeconds: {
      type: Number,
      required: true,
      min: [1, 'Window must be at least 1 second'],
      default: 60,
    },
    // Auto-block IP after this many violations
    violationsBeforeBlock: {
      type: Number,
      default: 5,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Virtual: requests per second equivalent
ratePolicySchema.virtual('requestsPerSecond').get(function () {
  return (this.requestsPerWindow / this.windowSeconds).toFixed(2);
});

// Ensure only one default policy
ratePolicySchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

const RatePolicy = mongoose.model('RatePolicy', ratePolicySchema);
module.exports = RatePolicy;
