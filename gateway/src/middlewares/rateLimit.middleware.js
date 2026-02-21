import { checkRateLimit } from "../services/rateLimit.service.js";
import { pushEvent } from "../services/eventQueue.service.js";

export const rateLimitMiddleware = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const ip = req.ip;

    const result = await checkRateLimit(userId);

    if (!result.allowed) {
      return res.status(429).json({
        message: "Rate limit exceeded"
      });
    }

    // Push event for worker analysis
    await pushEvent({
      userId: userId.toString(),
      ip,
      endpoint: req.originalUrl,
      timestamp: Date.now()
    });

    next();
  } catch (error) {
    next(error);
  }
};
