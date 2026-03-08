"use strict";

const express = require("express");
const { db, auth } = require("../firebase");
const { verifyToken } = require("../middleware/auth");
const { sendVerificationEmail } = require("../services/notificationService");

const router = express.Router();

// ── POST /auth/signup ─────────────────────────────────────────────────────────
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password, phone_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "name, email, and password are required.",
      });
    }

    // 1. Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone_number || undefined,
    });

    // 2. Generate verification link and email it to the user
    const verificationLink = await auth.generateEmailVerificationLink(email);
    try {
      await sendVerificationEmail(email, name, verificationLink);
    } catch (emailErr) {
      // Non-fatal — user account is created even if email delivery fails.
      // Log the link so an admin can manually resend if needed.
      console.error(`[Auth] Failed to send verification email to ${email}: ${emailErr.message}`);
      console.info(`[Auth] Manual verification link for ${email}: ${verificationLink}`);
    }

    // 3. Create Firestore user document
    const now = new Date().toISOString();
    await db.collection("users").doc(userRecord.uid).set({
      name,
      email,
      phone_number: phone_number || null,
      created_at: now,
      last_login: now,
      account_status: "active",
    });

    return res.status(201).json({
      message: "User created successfully. Please verify your email.",
      uid: userRecord.uid,
    });
  } catch (err) {
    // Firebase Auth error codes
    if (err.code === "auth/email-already-exists") {
      return res.status(409).json({
        error: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email already exists.",
      });
    }
    if (err.code === "auth/invalid-password") {
      return res.status(400).json({
        error: "WEAK_PASSWORD",
        message: "Password must be at least 6 characters.",
      });
    }
    return next(err);
  }
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
// Firebase Auth login is done client-side via the Firebase SDK (signInWithEmailAndPassword).
// This endpoint exists for server-side clients or REST testing; it issues a custom token
// that the client exchanges for an ID token via signInWithCustomToken().
router.post("/login", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "email is required.",
      });
    }

    // Look up user by email
    const userRecord = await auth.getUserByEmail(email);

    // Update last_login in Firestore
    await db.collection("users").doc(userRecord.uid).update({
      last_login: new Date().toISOString(),
    });

    // Issue custom token — client exchanges it for an ID token
    const customToken = await auth.createCustomToken(userRecord.uid);

    return res.json({
      message: "Custom token issued. Exchange with Firebase client SDK for ID token.",
      custom_token: customToken,
      uid: userRecord.uid,
    });
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      return res.status(404).json({
        error: "USER_NOT_FOUND",
        message: "No account found with this email.",
      });
    }
    return next(err);
  }
});

// ── GET /auth/profile ─────────────────────────────────────────────────────────
router.get("/profile", verifyToken, async (req, res, next) => {
  try {
    const { uid } = req.user;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        error: "USER_NOT_FOUND",
        message: "User profile not found.",
      });
    }

    return res.json({ uid, ...userDoc.data() });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
