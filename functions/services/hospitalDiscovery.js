/**
 * Hospital Discovery Service
 * Fetches real hospitals near given coordinates using OpenStreetMap's Overpass API.
 * Free, no API key required, global coverage.
 *
 * Flow:
 *   1. Query Overpass for amenity=hospital within a radius
 *   2. Parse results into a normalized hospital shape
 *   3. Deduplicate against existing Firestore hospitals
 *   4. Store new hospitals in Firestore
 */
"use strict";

const axios = require("axios");
const { db } = require("../firebase");
const { haversine } = require("./haversine");
const config = require("../config");
const logger = require("./logger");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/**
 * buildOverpassQuery — Generates an Overpass QL query for hospitals
 * within a radius (metres) of the given coordinates.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusMetres - Search radius in metres (default 25 km)
 * @returns {string} Overpass QL query
 */
function buildOverpassQuery(lat, lng, radiusMetres = 25000) {
  return `
    [out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radiusMetres},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMetres},${lat},${lng});
      relation["amenity"="hospital"](around:${radiusMetres},${lat},${lng});
    );
    out center tags;
  `;
}

/**
 * parseOverpassResults — Converts raw Overpass elements into normalized hospital objects.
 *
 * @param {Array} elements - Raw Overpass response elements
 * @param {number} userLat - User's latitude (for distance calculation)
 * @param {number} userLng - User's longitude
 * @returns {Array<object>} Normalized hospital objects
 */
function parseOverpassResults(elements, userLat, userLng) {
  const hospitals = [];

  for (const el of elements) {
    const tags = el.tags || {};

    // Skip non-hospital entries or entries without a name
    if (!tags.name) continue;

    // Coordinates: nodes have lat/lon directly; ways/relations use center
    const lat = el.lat || (el.center && el.center.lat);
    const lng = el.lon || (el.center && el.center.lon);

    if (!lat || !lng) continue;

    // Build address from available OSM tags
    const addressParts = [
      tags["addr:street"],
      tags["addr:housenumber"],
      tags["addr:city"] || tags["addr:suburb"],
      tags["addr:postcode"],
      tags["addr:state"],
    ].filter(Boolean);

    const address = addressParts.length > 0
      ? addressParts.join(", ")
      : tags["addr:full"] || null;

    const distance = haversine(userLat, userLng, lat, lng);

    hospitals.push({
      name: tags.name,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6)),
      emergency_phone: tags.phone || tags["contact:phone"] || tags["emergency:phone"] || null,
      address,
      contact_email: tags.email || tags["contact:email"] || null,
      fcm_token: null,
      osm_id: String(el.id),
      distance_km: parseFloat(distance.toFixed(2)),
      source: "openstreetmap",
    });
  }

  // Sort by distance and return
  hospitals.sort((a, b) => a.distance_km - b.distance_km);
  return hospitals;
}

/**
 * discoverHospitals — Fetches hospitals from OpenStreetMap near given coordinates.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} [radiusKm=25] - Search radius in kilometres
 * @returns {Promise<Array<object>>} Array of discovered hospitals
 */
async function discoverHospitals(lat, lng, radiusKm = 25) {
  const radiusMetres = radiusKm * 1000;
  const query = buildOverpassQuery(lat, lng, radiusMetres);

  logger.info("Discovering hospitals from OpenStreetMap", {
    route: "/v1/hospitals/discover",
    lat,
    lng,
    radiusKm,
  });

  try {
    const response = await axios.post(
      OVERPASS_URL,
      `data=${encodeURIComponent(query)}`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000,
      }
    );

    const elements = response.data.elements || [];
    logger.info("Overpass API returned results", {
      route: "/v1/hospitals/discover",
      rawCount: elements.length,
    });

    return parseOverpassResults(elements, lat, lng);
  } catch (err) {
    logger.error("Overpass API request failed", {
      route: "/v1/hospitals/discover",
      reason: err.message,
    });
    const wrapped = new Error(`Hospital discovery failed: ${err.message}`);
    wrapped.statusCode = 502;
    wrapped.code = "HOSPITAL_DISCOVERY_FAILED";
    throw wrapped;
  }
}

/**
 * discoverAndStore — Discovers hospitals via Overpass, deduplicates against
 * existing Firestore data (by osm_id), and stores new ones.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [radiusKm=25]
 * @returns {Promise<{ discovered: number, newlyAdded: number, hospitals: Array }>}
 */
async function discoverAndStore(lat, lng, radiusKm = 25) {
  const discovered = await discoverHospitals(lat, lng, radiusKm);

  if (discovered.length === 0) {
    return { discovered: 0, newlyAdded: 0, hospitals: [] };
  }

  // Fetch existing OSM IDs to avoid duplicates
  const existingSnap = await db
    .collection("hospitals")
    .where("osm_id", "!=", null)
    .get();

  const existingOsmIds = new Set();
  existingSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.osm_id) existingOsmIds.add(data.osm_id);
  });

  // Filter out already-stored hospitals
  const newHospitals = discovered.filter((h) => !existingOsmIds.has(h.osm_id));

  // Batch write new hospitals (Firestore batches max 500)
  if (newHospitals.length > 0) {
    const batches = [];
    for (let i = 0; i < newHospitals.length; i += 400) {
      const batch = db.batch();
      const slice = newHospitals.slice(i, i + 400);
      for (const h of slice) {
        const ref = db.collection("hospitals").doc();
        // Remove distance_km before storing — it's ephemeral
        const { distance_km, ...toStore } = h;
        batch.set(ref, {
          ...toStore,
          discovered_at: new Date().toISOString(),
        });
      }
      batches.push(batch.commit());
    }
    await Promise.all(batches);
  }

  logger.info("Hospital discovery complete", {
    route: "/v1/hospitals/discover",
    discovered: discovered.length,
    newlyAdded: newHospitals.length,
    duplicatesSkipped: discovered.length - newHospitals.length,
  });

  return {
    discovered: discovered.length,
    newlyAdded: newHospitals.length,
    hospitals: discovered.slice(0, config.TOP_HOSPITALS),
  };
}

module.exports = { discoverHospitals, discoverAndStore };
