"use strict";

const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { getPrediction } = require("../services/predictionService");
const { uploadImage } = require("../services/imageUpload");

const router = express.Router();

// ── POST /predict ─────────────────────────────────────────────────────────────
// Body: { image_url: string }
// Returns: { species, venom_risk, confidence_score }
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "image_url is required.",
      });
    }

    const prediction = await getPrediction(image_url);

    return res.json({
      message: "Prediction successful.",
      ...prediction,
    });
  } catch (err) {
    return next(err);
  }
});

// ── POST /predict/upload ──────────────────────────────────────────────────────
// Accepts multipart/form-data with a "snake_image" file field.
// Uploads the image to Firebase Storage, runs prediction synchronously,
// and returns the result without creating a report document.
// Content-Type: multipart/form-data
// Returns: { species, venom_risk, confidence_score }
router.post("/upload", verifyToken, async (req, res, next) => {
  try {
    const { signedUrl } = await uploadImage(
      req,
      "identify_images",
      req.user.uid,
      "snake"
    );

    const prediction = await getPrediction(signedUrl);

    return res.json({
      message: "Prediction successful.",
      ...prediction,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
