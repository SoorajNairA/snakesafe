import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  // For local emulator development any non-empty string works as the API key.
  // Replace all values with real ones from Firebase Console before deploying.
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "demo-local",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "snakebite-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "snakebite-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "snakebite-app.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:000000000000:web:demo",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firebaseAuth = getAuth(app);

// Point the client SDK at the local Auth Emulator during development so that
// users created via the backend (Admin SDK → emulator) can actually sign in.
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === "true"
) {
  try {
    connectAuthEmulator(firebaseAuth, "http://localhost:9099", { disableWarnings: true });
  } catch {
    // Already connected (Next.js HMR re-execution) — safe to ignore
  }
}

export default app;
