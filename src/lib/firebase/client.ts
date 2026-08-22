import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, firebaseConfigReady } from "./config";

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

const useEmulators =
  typeof process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

export function isFirebaseReady() {
  return firebaseConfigReady;
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigReady) {
    return null;
  }

  if (cachedApp) {
    return cachedApp;
  }

  cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

  return cachedApp;
}

export function getFirestoreDb(): Firestore | null {
  if (!firebaseConfigReady) {
    return null;
  }

  if (cachedDb) {
    return cachedDb;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  cachedDb = getFirestore(app);
  if (useEmulators && typeof window !== "undefined") {
    import("firebase/firestore").then(({ connectFirestoreEmulator }) => {
      if (cachedDb) {
        connectFirestoreEmulator(cachedDb, "localhost", 8080);
      }
    });
  }

  return cachedDb;
}

export function getFirebaseAuth(): Auth | null {
  if (!firebaseConfigReady) {
    return null;
  }

  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  cachedAuth = getAuth(app);
  if (useEmulators && typeof window !== "undefined") {
    // Lazy import to avoid shipping emulator code to production bundles unintentionally.
    import("firebase/auth").then(({ connectAuthEmulator }) => {
      if (cachedAuth) {
        connectAuthEmulator(cachedAuth, "http://localhost:9099", {
          disableWarnings: true,
        });
      }
    });

  }

  return cachedAuth;
}
