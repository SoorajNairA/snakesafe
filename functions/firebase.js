/**
 * Firebase Admin SDK initializer — singleton
 * Import this module wherever firebase-admin is needed.
 */
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const messaging = admin.messaging();

module.exports = { admin, db, auth, storage, messaging };
