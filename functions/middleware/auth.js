"use strict";

const { auth } = require("../firebase");

/**
 * verifyToken — Express middleware
 * Validates the Firebase ID token sent in the Authorization header.
 *
 * Expected header:  Authorization: Bearer <idToken>
 * On success:       attaches `req.user` with { uid, email, ... }
 * On failure:       responds 401 Unauthorized
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Authorization header missing or malformed. Expected: Bearer <token>",
      });
    }

    const idToken = authHeader.split("Bearer ")[1].trim();
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = decodedToken; // { uid, email, name, ... }
    return next();
  } catch (err) {
    console.error("[Auth Middleware] Token verification failed:", err.message);
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Invalid or expired authentication token.",
    });
  }
}

module.exports = { verifyToken };
