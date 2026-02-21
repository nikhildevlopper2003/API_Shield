import mongoose from "mongoose";

const ratePolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    windowSize: {
      type: Number,
      required: true // in seconds
    },
    maxRequests: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

export const RatePolicy = mongoose.model("RatePolicy", ratePolicySchema);
