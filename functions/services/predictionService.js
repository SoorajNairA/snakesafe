"use strict";

const axios = require("axios");
const config = require("../config");
const logger = require("./logger");
const { aiBreaker } = require("./circuitBreaker");

const AI_MODEL_URL = process.env.AI_MODEL_URL || "http://localhost:8000";

/**
 * callPredictionAPI
 * Wraps the HTTP call in:
 *   1. Circuit breaker — rejects immediately if AI service is OPEN
 *   2. Retry loop      — retries up to config.AI_RETRY_ATTEMPTS times
 *   3. Exponential backoff between retries
 *
 * @param {object} payload - { image_url: string }
 * @returns {Promise<object>} Raw model response data
 */
async function callPredictionAPI(payload) {
  // The circuit breaker wraps the entire retry block.
  // If the breaker is OPEN it throws immediately without any network calls.
  return aiBreaker.execute(async () => {
    let lastError;

    for (let attempt = 1; attempt <= config.AI_RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await axios.post(
          `${AI_MODEL_URL}/predict`,
          payload,
          {
            timeout: config.AI_TIMEOUT_MS,
            headers: { "Content-Type": "application/json" },
          }
        );
        return response.data;
      } catch (err) {
        lastError = err;
        logger.warn("AI prediction attempt failed", {
          route: "/v1/predict",
          attempt,
          maxAttempts: config.AI_RETRY_ATTEMPTS,
          reason: err.message,
        });

        if (attempt < config.AI_RETRY_ATTEMPTS) {
          // Exponential backoff: 1s → 2s → ...
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    // All retry attempts exhausted → let circuit breaker record the failure
    const wrapped = new Error(
      `AI prediction service unavailable after ${config.AI_RETRY_ATTEMPTS} attempts: ${lastError.message}`
    );
    wrapped.statusCode = 502;
    wrapped.code = "AI_PREDICTION_ERROR";
    throw wrapped;
  });
}

/**
 * getPrediction
 * Public interface — validates the model response shape.
 *
 * @param {string} imageUrl - Signed URL or public URL of the image
 * @returns {Promise<{ species: string, venom_risk: string, confidence_score: number }>}
 */
async function getPrediction(imageUrl) {
  const data = await callPredictionAPI({ image_url: imageUrl });

  const { species, venom_risk, confidence_score } = data;

  if (!species || !venom_risk || confidence_score == null) {
    const err = new Error("AI model returned an incomplete prediction payload.");
    err.statusCode = 502;
    err.code = "AI_PREDICTION_ERROR";
    throw err;
  }

  logger.info("Prediction received", {
    route: "/v1/predict",
    species,
    venom_risk,
    confidence_score,
    circuitState: aiBreaker.state,
  });

  return {
    species: String(species),
    venom_risk: String(venom_risk),
    confidence_score: Number(confidence_score),
  };
}

/**
 * getWoundDiagnosis
 * Calls the FastAPI /predict/wound endpoint to analyse a wound image
 * for snakebite characteristics.
 *
 * @param {string} imageUrl - Signed URL or public URL of the wound image
 * @returns {Promise<{ is_snakebite: boolean, confidence_score: number, description: string }>}
 */
async function getWoundDiagnosis(imageUrl) {
  let lastError;

  for (let attempt = 1; attempt <= config.AI_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await axios.post(
        `${AI_MODEL_URL}/predict/wound`,
        { image_url: imageUrl },
        {
          timeout: config.AI_TIMEOUT_MS,
          headers: { "Content-Type": "application/json" },
        }
      );
      const { is_snakebite, confidence_score, description } = response.data;

      if (is_snakebite === null || is_snakebite === undefined || confidence_score === null || confidence_score === undefined || !description) {
        const err = new Error("AI model returned an incomplete wound diagnosis payload.");
        err.statusCode = 502;
        err.code = "AI_PREDICTION_ERROR";
        throw err;
      }

      logger.info("Wound diagnosis received", {
        route: "/v1/predict/wound",
        is_snakebite,
        confidence_score,
      });

      return {
        is_snakebite: Boolean(is_snakebite),
        confidence_score: Number(confidence_score),
        description: String(description),
      };
    } catch (err) {
      lastError = err;
      logger.warn("Wound diagnosis attempt failed", {
        route: "/v1/predict/wound",
        attempt,
        maxAttempts: config.AI_RETRY_ATTEMPTS,
        reason: err.message,
      });

      if (attempt < config.AI_RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  const wrapped = new Error(
    `AI wound diagnosis service unavailable after ${config.AI_RETRY_ATTEMPTS} attempts: ${lastError.message}`
  );
  wrapped.statusCode = 502;
  wrapped.code = "AI_PREDICTION_ERROR";
  throw wrapped;
}

module.exports = { getPrediction, getWoundDiagnosis };
