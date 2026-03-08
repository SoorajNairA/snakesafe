"use strict";

/**
 * validateLocation — Validate and sanitize a location payload.
 *
 * Expected shape: { latitude, longitude, accuracy?, timestamp? }
 * @param {object} location
 * @returns {{ latitude: number, longitude: number, accuracy: number|null, timestamp: string }}
 */
function validateLocation(location) {
  if (!location || typeof location !== "object") {
    const err = new Error("Location data is required.");
    err.statusCode = 400;
    err.code = "LOCATION_NOT_AVAILABLE";
    throw err;
  }

  const lat = parseFloat(location.latitude);
  const lng = parseFloat(location.longitude);

  if (isNaN(lat) || lat < -90 || lat > 90) {
    const err = new Error("Invalid latitude value. Must be between -90 and 90.");
    err.statusCode = 400;
    err.code = "LOCATION_NOT_AVAILABLE";
    throw err;
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    const err = new Error("Invalid longitude value. Must be between -180 and 180.");
    err.statusCode = 400;
    err.code = "LOCATION_NOT_AVAILABLE";
    throw err;
  }

  return {
    latitude: lat,
    longitude: lng,
    accuracy: location.accuracy != null ? parseFloat(location.accuracy) : null,
    timestamp: location.timestamp || new Date().toISOString(),
  };
}

module.exports = { validateLocation };
