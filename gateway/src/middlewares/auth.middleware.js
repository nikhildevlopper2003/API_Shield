import { User } from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
      return res.status(401).json({ message: "API key missing" });
    }

    const user = await User.findOne({ apiKey });

    if (!user) {
      return res.status(401).json({ message: "Invalid API key" });
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
