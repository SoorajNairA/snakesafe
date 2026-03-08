/**
 * Central configuration file.
 * All magic numbers and tunable constants live here.
 * Every value can be overridden via environment variables — no code changes needed.
 */
"use strict";

module.exports = {
  // ── Image Upload ────────────────────────────────────────────────────────────
  MAX_IMAGE_SIZE_MB: parseInt(process.env.MAX_IMAGE_SIZE_MB || "5"),
  MAX_IMAGE_SIZE_BYTES:
    parseInt(process.env.MAX_IMAGE_SIZE_MB || "5") * 1024 * 1024,
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png"],

  // ── Hospital Lookup ─────────────────────────────────────────────────────────
  TOP_HOSPITALS: parseInt(process.env.TOP_HOSPITALS || "5"),

  // ── Hospital Discovery (OpenStreetMap Overpass) ─────────────────────────────
  HOSPITAL_DISCOVER_RADIUS_KM: parseInt(process.env.HOSPITAL_DISCOVER_RADIUS_KM || "25"),
  HOSPITAL_DISCOVER_MAX_RADIUS_KM: parseInt(process.env.HOSPITAL_DISCOVER_MAX_RADIUS_KM || "50"),

  // ── Report Pagination ───────────────────────────────────────────────────────
  REPORT_LIMIT_DEFAULT: parseInt(process.env.REPORT_LIMIT_DEFAULT || "20"),
  REPORT_LIMIT_MAX: parseInt(process.env.REPORT_LIMIT_MAX || "100"),

  // ── AI Prediction ───────────────────────────────────────────────────────────
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS || "15000"),
  AI_RETRY_ATTEMPTS: parseInt(process.env.AI_RETRY_ATTEMPTS || "2"),

  // ── Signed URLs ─────────────────────────────────────────────────────────────
  // Images are NOT made public. Signed URLs are generated on read (1 hour expiry).
  SIGNED_URL_EXPIRY_MS: parseInt(
    process.env.SIGNED_URL_EXPIRY_MS || String(60 * 60 * 1000) // 1 hour
  ),

  // ── Rate Limiting ───────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000) // 15 minutes
  ),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),

  // ── Email Notifications ─────────────────────────────────────────────────────
  EMAIL_RETRY_ATTEMPTS: parseInt(process.env.EMAIL_RETRY_ATTEMPTS || "2"),

  // ── Circuit Breaker (AI Prediction Service) ─────────────────────────────────
  // FAILURE_THRESHOLD — consecutive failures before opening the circuit
  CB_FAILURE_THRESHOLD: parseInt(process.env.CB_FAILURE_THRESHOLD || "5"),
  // SUCCESS_THRESHOLD — consecutive successes in HALF_OPEN before closing
  CB_SUCCESS_THRESHOLD: parseInt(process.env.CB_SUCCESS_THRESHOLD || "2"),
  // RESET_TIMEOUT_MS  — how long to stay OPEN before probing again (60 seconds)
  CB_RESET_TIMEOUT_MS: parseInt(
    process.env.CB_RESET_TIMEOUT_MS || String(60 * 1000)
  ),
};
