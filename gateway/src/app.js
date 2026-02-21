import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { authMiddleware } from "./middlewares/auth.middleware.js";
import { blockCheckMiddleware } from "./middlewares/blockCheck.middleware.js";
import { rateLimitMiddleware } from "./middlewares/rateLimit.middleware.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

import healthRoutes from "./routes/health.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// Global middlewares
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));

// Public route
app.use("/health", healthRoutes);

// Core protection pipeline
app.use(authMiddleware);
app.use(blockCheckMiddleware);
app.use(rateLimitMiddleware);

// Example protected route
app.get("/api/test", (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user.name
  });
});

// Admin routes (also protected)
app.use("/admin", adminRoutes);

// Error handler must be last
app.use(errorMiddleware);

export default app;
