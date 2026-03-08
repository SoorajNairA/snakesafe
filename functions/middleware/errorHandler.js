"use strict";

const logger = require("../services/logger");

/**
 * Centralized error handler middleware.
 * Uses the structured logger for consistent JSON log format.
 *
 * Log shape (example):
 * {
 *   "level": "error",
 *   "message": "Prediction timeout",
 *   "route": "/v1/predict",
 *   "method": "POST",
 *   "uid": "abc123",
 *   "requestId": "uuid-...",
 *   "errorCode": "AI_PREDICTION_ERROR",
 *   "status": 502,
 *   "timestamp": "..."
 * }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || "INTERNAL_SERVER_ERROR";
  const message = err.message || "An unexpected error occurred.";

  logger.error(message, {
    errorCode,
    status: statusCode,
    route: req.originalUrl,
    method: req.method,
    uid: req.user ? req.user.uid : null,
    requestId: req.id || null,
    ip: req.ip,
    // Stack trace only for 5xx — client errors don't need it
    stack: statusCode >= 500 ? err.stack : undefined,
  });

  return res.status(statusCode).json({
    error: errorCode,
    message,
    requestId: req.id || null,
  });
}

module.exports = errorHandler;
