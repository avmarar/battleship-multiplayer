import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import { firebaseConfig, firebaseConfigReady } from "./config";

type FirebaseGlobals = {
  __battleshipFirebaseApp?: FirebaseApp;
  __battleshipFirestore?: Firestore;
  __battleshipAuth?: Auth;
  __battleshipAuthEmulatorConnected?: boolean;
  __battleshipFirestoreEmulatorConnected?: boolean;
  __battleshipAnonymousSignIn?: Promise<unknown> | null;
};

const globals = globalThis as typeof globalThis & FirebaseGlobals;

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

  if (globals.__battleshipFirebaseApp) {
    return globals.__battleshipFirebaseApp;
  }

  globals.__battleshipFirebaseApp = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);

  return globals.__battleshipFirebaseApp;
}

export function getFirestoreDb(): Firestore | null {
  if (!firebaseConfigReady) {
    return null;
  }

  if (globals.__battleshipFirestore) {
    return globals.__battleshipFirestore;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const db = getFirestore(app);
  if (useEmulators && !globals.__battleshipFirestoreEmulatorConnected) {
    try {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    } catch {
      // Already connected (Fast Refresh / repeated init).
    }
    globals.__battleshipFirestoreEmulatorConnected = true;
  }

  globals.__battleshipFirestore = db;
  return db;
}

export function getFirebaseAuth(): Auth | null {
  if (!firebaseConfigReady) {
    return null;
  }

  if (globals.__battleshipAuth) {
    return globals.__battleshipAuth;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const auth = getAuth(app);
  if (useEmulators && !globals.__battleshipAuthEmulatorConnected) {
    try {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
    } catch {
      // Already connected (Fast Refresh / repeated init).
    }
    globals.__battleshipAuthEmulatorConnected = true;
  }

  globals.__battleshipAuth = auth;
  return auth;
}

/** Single-flight anonymous sign-in (avoids Strict Mode / remount duplicate signUp). */
export function ensureAnonymousSignIn(auth: Auth): Promise<unknown> {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  if (!globals.__battleshipAnonymousSignIn) {
    globals.__battleshipAnonymousSignIn = signInAnonymously(auth).finally(() => {
      if (!auth.currentUser) {
        globals.__battleshipAnonymousSignIn = null;
      }
    });
  }

  return globals.__battleshipAnonymousSignIn;
}
