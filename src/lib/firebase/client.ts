import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { firebaseConfig, firebaseConfigReady } from "./config";

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

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
  if (useEmulators && !firestoreEmulatorConnected) {
    try {
      connectFirestoreEmulator(cachedDb, "127.0.0.1", 8080);
    } catch {
      // Already connected (Fast Refresh / repeated init).
    }
    firestoreEmulatorConnected = true;
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
  if (useEmulators && !authEmulatorConnected) {
    try {
      connectAuthEmulator(cachedAuth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
    } catch {
      // Already connected (Fast Refresh / repeated init).
    }
    authEmulatorConnected = true;
  }

  return cachedAuth;
}
