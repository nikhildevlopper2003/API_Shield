import mongoose from "mongoose";

const abuseLogSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: String, // 🔥 changed to string
      index: true
    },
    endpoint: {
      type: String
    },
    reason: {
      type: String
    }
  },
  { timestamps: true }
);

export const AbuseLog = mongoose.model("AbuseLog", abuseLogSchema);