import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free"
    },
    rateLimit: {
      type: Number,
      default: 100
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
