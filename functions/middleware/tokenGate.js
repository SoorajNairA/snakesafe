"use strict";

const crypto = require("crypto");
const { admin, db } = require("../firebase");
const config = require("../config");

function buildAnonKey({ anonId, ip, userAgent }) {
  const raw = `${anonId}|${ip}|${userAgent}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

async function enforceFreeTokens(req, res, next) {
  if (req.user?.uid) {
    return next();
  }

  const anonId = req.headers["x-anon-id"];
  if (typeof anonId !== "string" || anonId.trim().length === 0) {
    return res.status(400).json({
      error: "ANON_ID_REQUIRED",
      message: "Anonymous access requires an anonymous ID.",
    });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";
  const anonKey = buildAnonKey({ anonId, ip, userAgent });
  const limit = config.FREE_SCAN_LIMIT;
  const docRef = db.collection("anonymous_usage").doc(anonKey);

  try {
    let remaining = 0;

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const count = snap.exists ? Number(snap.data().count || 0) : 0;

      if (count >= limit) {
        const err = new Error("TOKEN_LIMIT_EXCEEDED");
        err.code = "TOKEN_LIMIT_EXCEEDED";
        throw err;
      }

      const nextCount = count + 1;
      remaining = Math.max(limit - nextCount, 0);

      tx.set(
        docRef,
        {
          count: nextCount,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          created_at: snap.exists
            ? snap.data().created_at || admin.firestore.FieldValue.serverTimestamp()
            : admin.firestore.FieldValue.serverTimestamp(),
          last_ip: ip,
          last_user_agent: userAgent,
        },
        { merge: true }
      );
    });

    req.anonId = anonId;
    res.set("X-Token-Remaining", String(remaining));
    return next();
  } catch (err) {
    if (err.code === "TOKEN_LIMIT_EXCEEDED") {
      return res.status(402).json({
        error: "TOKEN_LIMIT_EXCEEDED",
        message: "Free scan limit exceeded. Please sign in to continue.",
      });
    }
    return next(err);
  }
}

module.exports = { enforceFreeTokens };
