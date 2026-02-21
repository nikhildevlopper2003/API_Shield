import mongoose from "mongoose";

const blockedIPSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true, unique: true },
    blockedUntil: { type: Date, required: true }
  },
  { timestamps: true }
);

export const BlockedIP = mongoose.model("BlockedIP", blockedIPSchema);