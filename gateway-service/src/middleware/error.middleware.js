const logger = require('../utils/logger');

/**
 * notFoundHandler
 * Returns 404 for unmatched routes.
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * errorHandler
 * Central error handler for all thrown/next(err) errors.
 */
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: errors.join(', '),
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: 'Conflict',
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }

  const statusCode = err.statusCode || err.status || 500;

  logger.error(`[ErrorHandler] ${statusCode} — ${err.message}`, {
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(statusCode).json({
    success: false,
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(isDev && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}

module.exports = { errorHandler, notFoundHandler };
