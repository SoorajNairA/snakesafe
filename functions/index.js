/**
 * Snakebite Detection & Emergency Assistance System
 * Cloud Functions Entry Point
 *
 * All routes mounted under /v1/ (API versioning).
 * Region: asia-south1 (Mumbai).
 * Base URL (emulator): http://localhost:5001/<project-id>/asia-south1/api/v1/
 */
"use strict";

const { randomUUID } = require("crypto");
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const logger = require("./services/logger");
const { aiBreaker } = require("./services/circuitBreaker");

const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");
const predictRoutes = require("./routes/predict");
const hospitalRoutes = require("./routes/hospitals");
const emergencyRoutes = require("./routes/emergency");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Request ID Middleware ─────────────────────────────────────────────────────
// Attaches a unique UUID to every request for end-to-end tracing.
// Clients may supply their own X-Request-ID; otherwise one is generated.
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || randomUUID();
  res.setHeader("X-Request-ID", req.id);
  next();
});

// ── Request Logging Middleware ────────────────────────────────────────────────
// Logs every request on response finish with duration and status.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info("REQUEST", {
      route: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      uid: req.user ? req.user.uid : null,
      requestId: req.id,
    });
  });
  next();
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMITED",
    message: "Too many requests. Please wait before trying again.",
  },
});

// Emergency alerts get a relaxed limit — never block a real emergency
const emergencyLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMITED",
    message: "Emergency endpoint rate limit exceeded.",
  },
});

app.use(globalLimiter);

// ── Health Check (unversioned) ────────────────────────────────────────────────
// Intentionally sits outside /v1/ so monitors can always reach it.
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Snakebite Detection & Emergency Assistance API",
    version: "v1",
    region: "asia-south1",
    requestId: req.id,
    circuit_breaker: aiBreaker.getStatus(),
    timestamp: new Date().toISOString(),
  });
});

// ── API v1 Router ─────────────────────────────────────────────────────────────
// All client-facing routes live under /v1.
// When v2 is needed, mount a new router at /v2 without breaking existing clients.
const v1 = express.Router();

v1.use("/emergency", emergencyLimiter);

v1.use("/auth", authRoutes);
v1.use("/report", reportRoutes);
v1.use("/predict", predictRoutes);
v1.use("/hospitals", hospitalRoutes);
v1.use("/emergency", emergencyRoutes);

app.use("/v1", v1);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `Route not found. All routes are prefixed with /v1/. Received: ${req.originalUrl}`,
  });
});

// ── Centralized error handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ── Export — region: asia-south1 (Mumbai) ────────────────────────────────────
// runWith({ secrets }) makes the named Secret Manager secrets available as
// process.env.SECRET_NAME at runtime. Add new secrets here as needed.
exports.api = functions
  .region("asia-south1")
  .runWith({
    secrets: ["AI_MODEL_URL", "EMAIL_HOST", "EMAIL_USER", "EMAIL_PASS"],
  })
  .https.onRequest(app);
