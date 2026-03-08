"use strict";

const express = require("express");
const { db } = require("../firebase");
const { verifyToken } = require("../middleware/auth");
const { haversine } = require("../services/haversine");
const { discoverAndStore } = require("../services/hospitalDiscovery");
const config = require("../config");

const router = express.Router();


// ── GET /hospitals/nearby?lat=&lng= ───────────────────────────────────────────
router.get("/nearby", verifyToken, async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Query parameters lat and lng are required and must be valid numbers.",
      });
    }

    // Fetch all hospitals (collection is small — typically a few hundred entries)
    const snapshot = await db.collection("hospitals").get();

    if (snapshot.empty) {
      return res.json({ hospitals: [], message: "No hospitals found in the database." });
    }

    // Calculate distance for each hospital then sort
    const hospitalsWithDistance = snapshot.docs.map((doc) => {
      const data = doc.data();
      const distance = haversine(lat, lng, data.latitude, data.longitude);
      return { id: doc.id, ...data, distance_km: parseFloat(distance.toFixed(2)) };
    });

    hospitalsWithDistance.sort((a, b) => a.distance_km - b.distance_km);
    const nearest = hospitalsWithDistance.slice(0, config.TOP_HOSPITALS);

    return res.json({ hospitals: nearest, count: nearest.length });
  } catch (err) {
    return next(err);
  }
});


// ── POST /hospitals/discover ──────────────────────────────────────────────────
// Body: { latitude, longitude, radius_km? }
// Discovers real hospitals near the user's location via OpenStreetMap
// and stores them in Firestore for future lookups.
router.post("/discover", verifyToken, async (req, res, next) => {
  try {
    const { latitude, longitude, radius_km } = req.body;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Valid latitude (-90 to 90) is required.",
      });
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Valid longitude (-180 to 180) is required.",
      });
    }

    const radius = radius_km
      ? Math.min(Math.max(parseFloat(radius_km), 1), config.HOSPITAL_DISCOVER_MAX_RADIUS_KM)
      : config.HOSPITAL_DISCOVER_RADIUS_KM;

    const result = await discoverAndStore(lat, lng, radius);

    return res.status(result.newlyAdded > 0 ? 201 : 200).json({
      message: result.newlyAdded > 0
        ? `Discovered ${result.discovered} hospitals, added ${result.newlyAdded} new ones.`
        : result.discovered > 0
          ? "All discovered hospitals are already in the database."
          : "No hospitals found in this area. Try a larger radius.",
      ...result,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
