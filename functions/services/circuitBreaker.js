/**
 * Circuit Breaker for external service calls (e.g. AI Prediction API).
 *
 * Prevents hammering a failing service by tracking consecutive failures
 * and temporarily short-circuiting requests.
 *
 * States:
 *   CLOSED   — Normal operation. Requests pass through.
 *   OPEN     — Service is failing. Requests are rejected immediately.
 *   HALF_OPEN — Testing period after timeout. One request is allowed through.
 *               Success → CLOSED. Failure → OPEN again.
 *
 * Config (all values come from config.js / env vars):
 *   FAILURE_THRESHOLD  — Consecutive failures before opening the circuit.
 *   SUCCESS_THRESHOLD  — Consecutive successes in HALF_OPEN before closing.
 *   RESET_TIMEOUT_MS   — How long to stay OPEN before trying HALF_OPEN.
 */
"use strict";

const logger = require("./logger");
const config = require("../config");

const STATE = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
};

class CircuitBreaker {
  /**
   * @param {string} name          - Human-readable service name (for logs)
   * @param {object} [opts]
   * @param {number} [opts.failureThreshold]
   * @param {number} [opts.successThreshold]
   * @param {number} [opts.resetTimeoutMs]
   */
  constructor(name, opts = {}) {
    this.name = name;
    this.failureThreshold =
      opts.failureThreshold ?? config.CB_FAILURE_THRESHOLD;
    this.successThreshold =
      opts.successThreshold ?? config.CB_SUCCESS_THRESHOLD;
    this.resetTimeoutMs = opts.resetTimeoutMs ?? config.CB_RESET_TIMEOUT_MS;

    this._state = STATE.CLOSED;
    this._failureCount = 0;
    this._successCount = 0;
    this._openedAt = null; // timestamp when circuit opened
  }

  get state() {
    return this._state;
  }

  /**
   * execute — Wraps an async function call with circuit breaker logic.
   *
   * @param {() => Promise<any>} fn - The async function to protect
   * @returns {Promise<any>}
   * @throws If circuit is OPEN, or if fn throws
   */
  async execute(fn) {
    if (this._state === STATE.OPEN) {
      const elapsed = Date.now() - this._openedAt;

      if (elapsed >= this.resetTimeoutMs) {
        // Transition to HALF_OPEN to probe the service
        this._state = STATE.HALF_OPEN;
        this._successCount = 0;
        logger.warn(`[CircuitBreaker:${this.name}] → HALF_OPEN (probing after ${Math.round(elapsed / 1000)}s)`);
      } else {
        // Still open — reject immediately
        const remaining = Math.round((this.resetTimeoutMs - elapsed) / 1000);
        const err = new Error(
          `${this.name} circuit is OPEN. Try again in ~${remaining}s.`
        );
        err.statusCode = 503;
        err.code = "AI_PREDICTION_ERROR";
        throw err;
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    this._failureCount = 0;

    if (this._state === STATE.HALF_OPEN) {
      this._successCount++;
      if (this._successCount >= this.successThreshold) {
        this._state = STATE.CLOSED;
        this._successCount = 0;
        logger.info(
          `[CircuitBreaker:${this.name}] → CLOSED (service recovered)`
        );
      }
    }
  }

  _onFailure(err) {
    this._failureCount++;

    if (
      this._state === STATE.HALF_OPEN ||
      this._failureCount >= this.failureThreshold
    ) {
      this._state = STATE.OPEN;
      this._openedAt = Date.now();
      logger.error(
        `[CircuitBreaker:${this.name}] → OPEN after ${this._failureCount} failures`,
        { reason: err.message }
      );
    } else {
      logger.warn(
        `[CircuitBreaker:${this.name}] Failure ${this._failureCount}/${this.failureThreshold}`,
        { reason: err.message }
      );
    }
  }

  /** Returns a status snapshot — useful for health check endpoints. */
  getStatus() {
    return {
      name: this.name,
      state: this._state,
      failureCount: this._failureCount,
      openedAt: this._openedAt
        ? new Date(this._openedAt).toISOString()
        : null,
    };
  }
}

// ── Singleton instances ───────────────────────────────────────────────────────
// Export pre-created breakers so state is shared across all requests
// within the same Cloud Function instance.
const aiBreaker = new CircuitBreaker("AI-Prediction");

module.exports = { CircuitBreaker, aiBreaker };
