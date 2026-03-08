/**
 * Structured Logger
 * Outputs consistent JSON log entries compatible with Google Cloud Logging.
 *
 * Log shape:
 * {
 *   "level": "info" | "warn" | "error",
 *   "message": "...",
 *   "route": "/v1/predict",
 *   "uid": "abc123",
 *   "requestId": "uuid",
 *   "timestamp": "ISO string",
 *   ... any extra context
 * }
 */
"use strict";

/**
 * Build and emit one structured log entry.
 *
 * @param {"info"|"warn"|"error"} level
 * @param {string} message
 * @param {object} [context={}] - any extra fields (route, uid, requestId, etc.)
 */
function log(level, message, context = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const json = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(json);
      break;
    case "warn":
      console.warn(json);
      break;
    default:
      console.info(json);
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

/** @param {string} message @param {object} [ctx] */
const info = (message, ctx = {}) => log("info", message, ctx);

/** @param {string} message @param {object} [ctx] */
const warn = (message, ctx = {}) => log("warn", message, ctx);

/** @param {string} message @param {object} [ctx] */
const error = (message, ctx = {}) => log("error", message, ctx);

/**
 * fromRequest — extract common request fields for log context.
 * Attach to any log call for consistent per-request metadata.
 *
 * @param {import('express').Request} req
 * @returns {{ route: string, method: string, uid: string|null, requestId: string }}
 */
function fromRequest(req) {
  return {
    route: req.originalUrl,
    method: req.method,
    uid: req.user ? req.user.uid : null,
    requestId: req.id || null,
  };
}

module.exports = { log, info, warn, error, fromRequest };
