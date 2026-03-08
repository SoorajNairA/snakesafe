"use strict";

const express = require("express");
const Busboy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { db, storage } = require("../firebase");
const { verifyToken } = require("../middleware/auth");
const { validateLocation } = require("../services/locationService");
const { getPrediction } = require("../services/predictionService");
const { notifyAnalysisComplete } = require("../services/notificationService");
const { generateSignedUrl } = require("../services/imageUpload");
const config = require("../config");

const router = express.Router();

// ── POST /report/create ───────────────────────────────────────────────────────
// Accepts multipart/form-data with fields:
//   snake_image   (file)
//   bite_image    (file, optional)
//   symptoms      (JSON string array, optional)
//   location      (JSON string: { latitude, longitude, accuracy?, timestamp? })
//   fcm_token     (string, optional — for push notification when prediction completes)
router.post("/create", verifyToken, async (req, res, next) => {
  const uid = req.user.uid;
  try {
    // 1. Parse multipart and upload images
    const { snakeImageResult, biteImageResult, fields } =
      await parseMultipartReport(req, uid);

    // 2. Validate location
    let locationData = null;
    if (fields.location) {
      try {
        locationData = validateLocation(JSON.parse(fields.location));
      } catch (e) {
        return res
          .status(400)
          .json({ error: "LOCATION_NOT_AVAILABLE", message: e.message });
      }
    }

    const symptoms = fields.symptoms ? JSON.parse(fields.symptoms) : [];
    const fcmToken = fields.fcm_token || null;

    // 3. Store storage PATHS (not signed URLs) in Firestore — paths never expire
    const now = new Date().toISOString();
    const reportRef = await db.collection("reports").add({
      user_id: uid,
      snake_image_path: snakeImageResult ? snakeImageResult.storagePath : null,
      bite_image_path: biteImageResult ? biteImageResult.storagePath : null,
      symptoms,
      location: locationData,
      prediction_result: null,
      venom_risk: null,
      confidence_score: null,
      timestamp: now,
      emergency_triggered: false,
      status: "pending_prediction",
    });

    // 4. Fire-and-forget AI prediction — doesn't block response
    if (snakeImageResult) {
      (async () => {
        try {
          // Use the signed URL issued at upload time (still valid for 1 hour)
          const prediction = await getPrediction(snakeImageResult.signedUrl);
          await reportRef.update({
            prediction_result: prediction.species,
            venom_risk: prediction.venom_risk,
            confidence_score: prediction.confidence_score,
            status: "prediction_complete",
          });
          console.info(
            `[Reports] Prediction stored for report ${reportRef.id}`
          );
          if (fcmToken) {
            await notifyAnalysisComplete(fcmToken, reportRef.id, prediction);
          }
        } catch (predErr) {
          console.error(
            `[Reports] Prediction failed for ${reportRef.id}: ${predErr.message}`
          );
          await reportRef.update({ status: "prediction_failed" });
        }
      })();
    }

    return res.status(201).json({
      message: "Report created. Prediction is being processed.",
      report_id: reportRef.id,
    });
  } catch (err) {
    return next(err);
  }
});

// ── GET /report/history ───────────────────────────────────────────────────────
// #3 Capped pagination + #4 Cursor pagination
// Query params: ?limit=20&cursor=<reportDocId>
router.get("/history", verifyToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;

    // #3 — cap limit between 1 and REPORT_LIMIT_MAX
    const limit = Math.min(
      Math.max(parseInt(req.query.limit) || config.REPORT_LIMIT_DEFAULT, 1),
      config.REPORT_LIMIT_MAX
    );

    // #4 — cursor-based pagination
    let query = db
      .collection("reports")
      .where("user_id", "==", uid)
      .orderBy("timestamp", "desc")
      .limit(limit);

    if (req.query.cursor) {
      const lastDoc = await db
        .collection("reports")
        .doc(req.query.cursor)
        .get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();

    // #5 — Regenerate signed URLs for each report at read time
    const reports = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const snakeUrl = await generateSignedUrl(data.snake_image_path);
        const biteUrl = await generateSignedUrl(data.bite_image_path);
        return {
          id: doc.id,
          ...data,
          snake_image_url: snakeUrl,
          bite_image_url: biteUrl,
        };
      })
    );

    const lastVisible = snapshot.docs[snapshot.docs.length - 1];

    return res.json({
      reports,
      count: reports.length,
      nextCursor: lastVisible ? lastVisible.id : null,
    });
  } catch (err) {
    return next(err);
  }
});

// ── GET /report/:id ───────────────────────────────────────────────────────────
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const reportDoc = await db
      .collection("reports")
      .doc(req.params.id)
      .get();

    if (!reportDoc.exists) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Report not found." });
    }

    const report = reportDoc.data();

    if (report.user_id !== uid) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "You do not have permission to access this report.",
      });
    }

    // #5 — Generate fresh signed URLs on read
    const snakeUrl = await generateSignedUrl(report.snake_image_path);
    const biteUrl = await generateSignedUrl(report.bite_image_path);

    return res.json({
      id: reportDoc.id,
      ...report,
      snake_image_url: snakeUrl,
      bite_image_url: biteUrl,
    });
  } catch (err) {
    return next(err);
  }
});

// ── Internal: Parse multipart form with two optional image files ──────────────
function parseMultipartReport(req, userId) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const fields = {};
    const uploadPromises = [];
    const uploadResultMap = {};

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("file", (fieldname, file, info) => {
      const { mimeType } = info;

      if (!["snake_image", "bite_image"].includes(fieldname)) {
        file.resume();
        return;
      }

      if (!config.ALLOWED_MIME_TYPES.includes(mimeType)) {
        file.resume();
        return reject(
          Object.assign(new Error("Only JPEG and PNG images are accepted."), {
            statusCode: 400,
            code: "IMAGE_UPLOAD_FAILED",
          })
        );
      }

      const imageType = fieldname === "snake_image" ? "snake" : "bite";
      const folder = imageType === "snake" ? "snake_images" : "bite_images";
      const ext = mimeType === "image/png" ? "png" : "jpg";
      const destFileName = `${userId}_${Date.now()}_${imageType}.${ext}`;
      const storagePath = `${folder}/${destFileName}`;
      const tmpPath = path.join(os.tmpdir(), destFileName);
      const writeStream = fs.createWriteStream(tmpPath);
      let bytes = 0;

      file.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > config.MAX_IMAGE_SIZE_BYTES) {
          writeStream.destroy();
          file.resume();
          return reject(
            Object.assign(
              new Error(`Image exceeds ${config.MAX_IMAGE_SIZE_MB} MB limit.`),
              { statusCode: 400, code: "IMAGE_UPLOAD_FAILED" }
            )
          );
        }
        writeStream.write(chunk);
      });

      const uploadPromise = new Promise((res2, rej2) => {
        file.on("end", () => writeStream.end());
        writeStream.on("finish", async () => {
          try {
            const bucket = storage.bucket();
            await bucket.upload(tmpPath, {
              destination: storagePath,
              metadata: { contentType: mimeType },
            });
            // #5 — signed URL, not public
            const [signedUrl] = await bucket.file(storagePath).getSignedUrl({
              action: "read",
              expires: Date.now() + config.SIGNED_URL_EXPIRY_MS,
            });
            fs.unlink(tmpPath, () => {});
            res2({ field: fieldname, signedUrl, storagePath });
          } catch (e) {
            fs.unlink(tmpPath, () => {});
            rej2(
              Object.assign(e, { statusCode: 500, code: "IMAGE_UPLOAD_FAILED" })
            );
          }
        });
        writeStream.on("error", rej2);
      });

      uploadResultMap[fieldname] = null;
      uploadPromises.push(uploadPromise);
    });

    bb.on("finish", async () => {
      try {
        const results = await Promise.all(uploadPromises);
        results.forEach((r) => {
          uploadResultMap[r.field] = { signedUrl: r.signedUrl, storagePath: r.storagePath };
        });
        resolve({
          snakeImageResult: uploadResultMap["snake_image"] || null,
          biteImageResult: uploadResultMap["bite_image"] || null,
          fields,
        });
      } catch (e) {
        reject(e);
      }
    });

    bb.on("error", reject);
    req.pipe(bb);
  });
}

module.exports = router;
