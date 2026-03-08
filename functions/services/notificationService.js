"use strict";

const nodemailer = require("nodemailer");
const { messaging } = require("../firebase");
const config = require("../config");

// ── Email transporter (Nodemailer SMTP) ──────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * sendEmailWithRetry — wraps nodemailer sendMail with configurable retry.
 * #9 — prevents silent email loss on transient SMTP failures.
 */
async function sendEmailWithRetry(mailOptions) {
  let lastError;
  for (let i = 1; i <= config.EMAIL_RETRY_ATTEMPTS; i++) {
    try {
      await transporter.sendMail(mailOptions);
      return; // success
    } catch (err) {
      lastError = err;
      if (i < config.EMAIL_RETRY_ATTEMPTS) {
        console.warn(`[NotificationService] Email attempt ${i} failed, retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * i));
      }
    }
  }
  throw lastError;
}


/**
 * sendEmergencyEmail
 * Sends an emergency alert email to a hospital contact address.
 *
 * @param {object} opts
 * @param {string} opts.toEmail     - Hospital contact email
 * @param {string} opts.hospitalName
 * @param {object} opts.user        - { uid, name?, email }
 * @param {object} opts.location    - { latitude, longitude }
 * @param {string} opts.reportId
 * @param {string} opts.alertId
 */
async function sendEmergencyEmail({ toEmail, hospitalName, user, location, reportId, alertId }) {
  const from = process.env.EMAIL_FROM || "Snakebite Alert <noreply@snakebite.app>";

  const mapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  const mailOptions = {
    from,
    to: toEmail,
    subject: `⚠️ SNAKEBITE EMERGENCY ALERT — Immediate Assistance Required`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#d32f2f;">🐍 Snakebite Emergency Alert</h2>
        <p>A snakebite emergency alert has been triggered and your hospital has been identified as the nearest facility.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;font-weight:bold;">Alert ID</td><td>${alertId}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Report ID</td><td>${reportId}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">User ID</td><td>${user.uid}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Hospital</td><td>${hospitalName}</td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Location</td>
              <td><a href="${mapsLink}">Lat: ${location.latitude}, Lng: ${location.longitude}</a></td></tr>
          <tr><td style="padding:6px;font-weight:bold;">Time</td><td>${new Date().toUTCString()}</td></tr>
        </table>
        <p style="color:#b71c1c;font-weight:bold;">Please respond immediately.</p>
        <hr/>
        <p style="font-size:0.8em;color:#777;">
          This is an automated alert from the Snakebite Detection &amp; Emergency Assistance System.
          This system does not replace professional medical advice.
        </p>
      </div>
    `,
  };

  try {
    await sendEmailWithRetry(mailOptions);
    console.info(`[NotificationService] Emergency email sent to ${toEmail} (Alert: ${alertId})`);
  } catch (err) {
    console.error(`[NotificationService] Email dispatch failed after retries: ${err.message}`);
    // Non-fatal — emergency alert is still stored in Firestore even if email fails
  }
}

/**
 * sendFCMNotification
 * Sends a Firebase Cloud Messaging push notification to a device token.
 *
 * @param {string} fcmToken   - Target device/hospital FCM token
 * @param {string} title      - Notification title
 * @param {string} body       - Notification body
 * @param {object} data       - Extra key-value data payload
 */
async function sendFCMNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    console.warn("[NotificationService] FCM token not provided, skipping push notification.");
    return;
  }

  const message = {
    token: fcmToken,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    android: { priority: "high" },
    apns: { headers: { "apns-priority": "10" } },
  };

  try {
    const response = await messaging.send(message);
    console.info(`[NotificationService] FCM sent (${response})`);
  } catch (err) {
    console.error(`[NotificationService] FCM dispatch failed: ${err.message}`);
    // Non-fatal
  }
}

/**
 * notifyAnalysisComplete
 * Sends a push notification to the user's device when prediction is ready.
 *
 * @param {string} userFcmToken
 * @param {string} reportId
 * @param {object} prediction - { species, venom_risk, confidence_score }
 */
async function notifyAnalysisComplete(userFcmToken, reportId, prediction) {
  const risk = prediction.venom_risk || "unknown";
  await sendFCMNotification(
    userFcmToken,
    "🐍 Analysis Complete",
    `Species: ${prediction.species} | Risk: ${risk}`,
    { type: "ANALYSIS_COMPLETE", reportId, ...prediction }
  );
}

/**
 * sendVerificationEmail
 * Sends an email verification link to a newly registered user.
 *
 * @param {string} toEmail       - Recipient email address
 * @param {string} name          - User's display name
 * @param {string} verifyUrl     - Firebase-generated email verification link
 */
async function sendVerificationEmail(toEmail, name, verifyUrl) {
  const from = process.env.EMAIL_FROM || "Snakebite Alert <noreply@snakebite.app>";
  const displayName = name || "there";

  const mailOptions = {
    from,
    to: toEmail,
    subject: "Verify your SnakeSafe account",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#c62828;">🐍 Welcome to SnakeSafe, ${displayName}!</h2>
        <p>Thanks for signing up. Please verify your email address to activate your account.</p>
        <p style="margin:24px 0;">
          <a href="${verifyUrl}"
             style="background:#c62828;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="color:#555;font-size:0.9em;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break:break-all;font-size:0.85em;color:#1565c0;">${verifyUrl}</p>
        <p style="color:#555;font-size:0.85em;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        <hr/>
        <p style="font-size:0.8em;color:#777;">
          Snakebite Detection &amp; Emergency Assistance System
        </p>
      </div>
    `,
  };

  await sendEmailWithRetry(mailOptions);
  console.info(`[NotificationService] Verification email sent to ${toEmail}`);
}

module.exports = { sendEmergencyEmail, sendFCMNotification, notifyAnalysisComplete, sendVerificationEmail };
