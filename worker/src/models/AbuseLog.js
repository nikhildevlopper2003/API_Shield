import mongoose from "mongoose";

const abuseLogSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    userId: { type: String },
    endpoint: { type: String },
    reason: { type: String }
  },
  { timestamps: true }
);

export const AbuseLog = mongoose.model("AbuseLog", abuseLogSchema);