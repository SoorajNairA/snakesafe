/**
 * hospitals_seed.js
 * Discovers real hospitals near given coordinates using OpenStreetMap
 * and seeds them into Firestore.
 *
 * Usage (with emulator):
 *   set FIRESTORE_EMULATOR_HOST=localhost:8080
 *   set GCLOUD_PROJECT=snakebite-app
 *   node data/hospitals_seed.js <latitude> <longitude> [radius_km]
 *
 * Examples:
 *   node data/hospitals_seed.js 3.17 101.70          # Kuala Lumpur, 25km radius
 *   node data/hospitals_seed.js 28.61 77.23 30       # New Delhi, 30km radius
 *   node data/hospitals_seed.js 13.08 80.27           # Chennai, 25km radius
 *
 * Usage (production):
 *   node data/hospitals_seed.js <lat> <lng>
 *   (ensure GOOGLE_APPLICATION_CREDENTIALS is set)
 */
"use strict";

const admin = require("firebase-admin");
const axios = require("axios");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/**
 * Fetch hospitals from OpenStreetMap Overpass API.
 */
async function fetchHospitals(lat, lng, radiusKm) {
  const radiusMetres = radiusKm * 1000;
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="hospital"](around:${radiusMetres},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMetres},${lat},${lng});
      relation["amenity"="hospital"](around:${radiusMetres},${lat},${lng});
    );
    out center tags;
  `;

  console.log(`🔍 Searching for hospitals within ${radiusKm}km of (${lat}, ${lng})...`);

  const response = await axios.post(
    OVERPASS_URL,
    `data=${encodeURIComponent(query)}`,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 25000,
    }
  );

  const elements = response.data.elements || [];
  console.log(`   Found ${elements.length} raw results from OpenStreetMap.`);

  const hospitals = [];

  for (const el of elements) {
    const tags = el.tags || {};
    if (!tags.name) continue;

    const hLat = el.lat || (el.center && el.center.lat);
    const hLng = el.lon || (el.center && el.center.lon);
    if (!hLat || !hLng) continue;

    const addressParts = [
      tags["addr:street"],
      tags["addr:housenumber"],
      tags["addr:city"] || tags["addr:suburb"],
      tags["addr:postcode"],
      tags["addr:state"],
    ].filter(Boolean);

    hospitals.push({
      name: tags.name,
      latitude: parseFloat(hLat.toFixed(6)),
      longitude: parseFloat(hLng.toFixed(6)),
      emergency_phone: tags.phone || tags["contact:phone"] || tags["emergency:phone"] || null,
      address: addressParts.length > 0 ? addressParts.join(", ") : tags["addr:full"] || null,
      contact_email: tags.email || tags["contact:email"] || null,
      fcm_token: null,
      osm_id: String(el.id),
      source: "openstreetmap",
      discovered_at: new Date().toISOString(),
    });
  }

  return hospitals;
}

async function seed(lat, lng, radiusKm) {
  const hospitals = await fetchHospitals(lat, lng, radiusKm);

  if (hospitals.length === 0) {
    console.log("⚠️  No hospitals found. Try a larger radius or different coordinates.");
    process.exit(0);
  }

  console.log(`📋 ${hospitals.length} hospitals with names found. Seeding into Firestore...`);

  // Batch write (max 500 per batch)
  for (let i = 0; i < hospitals.length; i += 400) {
    const batch = db.batch();
    const slice = hospitals.slice(i, i + 400);
    for (const h of slice) {
      const ref = db.collection("hospitals").doc();
      batch.set(ref, h);
    }
    await batch.commit();
  }

  console.log(`✅ Seeded ${hospitals.length} hospitals into Firestore.`);
  console.log("\nTop 5 nearest:");
  hospitals.slice(0, 5).forEach((h, i) => {
    console.log(`  ${i + 1}. ${h.name} (${h.latitude}, ${h.longitude})`);
    if (h.address) console.log(`     📍 ${h.address}`);
    if (h.emergency_phone) console.log(`     📞 ${h.emergency_phone}`);
  });

  process.exit(0);
}

// ── CLI argument parsing ──────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error(`
Usage: node data/hospitals_seed.js <latitude> <longitude> [radius_km]

Examples:
  node data/hospitals_seed.js 3.17 101.70          # Kuala Lumpur
  node data/hospitals_seed.js 28.61 77.23 30       # New Delhi
  node data/hospitals_seed.js 13.08 80.27           # Chennai
  node data/hospitals_seed.js 40.71 -74.01 15      # New York
  `);
  process.exit(1);
}

const lat = parseFloat(args[0]);
const lng = parseFloat(args[1]);
const radiusKm = parseFloat(args[2] || "25");

if (isNaN(lat) || lat < -90 || lat > 90) {
  console.error("❌ Invalid latitude. Must be between -90 and 90.");
  process.exit(1);
}
if (isNaN(lng) || lng < -180 || lng > 180) {
  console.error("❌ Invalid longitude. Must be between -180 and 180.");
  process.exit(1);
}

seed(lat, lng, radiusKm).catch((err) => {
  console.error("❌ Seeding failed:", err.message || err);
  process.exit(1);
});
