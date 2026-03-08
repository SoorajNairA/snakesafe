"use strict";

const express = require("express");
const { db } = require("../firebase");
const { verifyToken } = require("../middleware/auth");
const { validateLocation } = require("../services/locationService");
const { haversine } = require("../services/haversine");
const {
  sendEmergencyEmail,
  sendFCMNotification,
} = require("../services/notificationService");

const router = express.Router();

// ── POST /emergency/send ──────────────────────────────────────────────────────
// Body (JSON):
//   {
//     report_id: string,          // existing report ID
//     location: { latitude, longitude, accuracy?, timestamp? },
//     fcm_token?: string          // user's FCM token for server-side confirmation
//   }
router.post("/send", verifyToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { report_id, location: rawLocation, fcm_token } = req.body;

    // --- 1. Validate location ---
    let location;
    try {
      location = validateLocation(rawLocation);
    } catch (e) {
      return res.status(400).json({ error: "LOCATION_NOT_AVAILABLE", message: e.message });
    }

    // --- 2. Validate report exists and belongs to user ---
    if (!report_id) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "report_id is required.",
      });
    }

    const reportDoc = await db.collection("reports").doc(report_id).get();
    if (!reportDoc.exists) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Report not found." });
    }
    if (reportDoc.data().user_id !== uid) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Report ownership mismatch." });
    }

    // --- 3. Find nearest hospital ---
    const hospitalsSnap = await db.collection("hospitals").get();
    if (hospitalsSnap.empty) {
      const err = new Error("No hospitals found. Cannot route emergency alert.");
      err.statusCode = 503;
      err.code = "EMERGENCY_ALERT_FAILED";
      return next(err);
    }

    let nearestHospital = null;
    let minDistance = Infinity;

    hospitalsSnap.docs.forEach((doc) => {
      const h = doc.data();
      const dist = haversine(location.latitude, location.longitude, h.latitude, h.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestHospital = { id: doc.id, ...h };
      }
    });

    // --- 4. Create emergency_alert document ---
    const alertTime = new Date().toISOString();
    const alertRef = await db.collection("emergency_alerts").add({
      user_id: uid,
      report_id,
      hospital_id: nearestHospital.id,
      location,
      alert_time: alertTime,
      status: "sent",
      distance_km: parseFloat(minDistance.toFixed(2)),
    });

    // --- 5. Update report to flag emergency ---
    await db.collection("reports").doc(report_id).update({
      emergency_triggered: true,
      emergency_alert_id: alertRef.id,
    });

    // --- 6. Send notifications (non-blocking) ---
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : { uid };

    // Email hospital if it has a contact email
    if (nearestHospital.contact_email) {
      sendEmergencyEmail({
        toEmail: nearestHospital.contact_email,
        hospitalName: nearestHospital.name,
        user: { uid, ...userData },
        location,
        reportId: report_id,
        alertId: alertRef.id,
      }).catch((e) => console.error("[Emergency] Email error:", e.message));
    }

    // FCM to hospital if it has a registered FCM token
    if (nearestHospital.fcm_token) {
      sendFCMNotification(
        nearestHospital.fcm_token,
        "🚨 Snakebite Emergency",
        `Patient at Lat:${location.latitude} Lng:${location.longitude} — ${nearestHospital.name}`,
        { type: "EMERGENCY_ALERT", alertId: alertRef.id, reportId: report_id }
      ).catch((e) => console.error("[Emergency] FCM error:", e.message));
    }

    // FCM confirmation to user
    if (fcm_token) {
      sendFCMNotification(
        fcm_token,
        "🏥 Emergency Alert Sent",
        `Help is on the way. Nearest hospital: ${nearestHospital.name} (${minDistance.toFixed(1)} km)`,
        { type: "EMERGENCY_CONFIRMED", alertId: alertRef.id, hospitalId: nearestHospital.id }
      ).catch((e) => console.error("[Emergency] User FCM error:", e.message));
    }

    console.info(
      `[Emergency] Alert ${alertRef.id} sent for user ${uid} → hospital ${nearestHospital.id} (${minDistance.toFixed(2)} km)`
    );

    return res.status(201).json({
      message: "Emergency alert sent successfully.",
      alert_id: alertRef.id,
      nearest_hospital: {
        id: nearestHospital.id,
        name: nearestHospital.name,
        address: nearestHospital.address,
        emergency_phone: nearestHospital.emergency_phone,
        distance_km: parseFloat(minDistance.toFixed(2)),
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ── GET /emergency/status/:alertId ────────────────────────────────────────────
router.get("/status/:alertId", verifyToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const alertDoc = await db
      .collection("emergency_alerts")
      .doc(req.params.alertId)
      .get();

    if (!alertDoc.exists) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Alert not found." });
    }

    const alert = alertDoc.data();
    if (alert.user_id !== uid) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Alert ownership mismatch." });
    }

    return res.json({ id: alertDoc.id, ...alert });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
