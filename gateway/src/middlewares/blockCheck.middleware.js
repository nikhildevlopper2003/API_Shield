import { isBlocked } from "../services/block.service.js";

export const blockCheckMiddleware = async (req, res, next) => {
  try {
    const ip = req.ip;

    // Temporary logging to verify IP
    console.log(`Request IP: ${ip}`);

    const blocked = await isBlocked(ip);

    if (blocked) {
      return res.status(403).json({
        message: "Your IP is temporarily blocked"
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};