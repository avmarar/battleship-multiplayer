"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  type Auth,
} from "firebase/auth";
import {
  getFirebaseAuth,
  getFirestoreDb,
  isFirebaseReady,
} from "./client";

export type AnonymousAuthState =
  | { status: "unavailable"; message: string }
  | { status: "checking" }
  | { status: "error"; message: string }
  | { status: "connected"; uid: string };

export function subscribeToAnonymousAuth(
  auth: Auth,
  onChange: (state: AnonymousAuthState) => void
) {
  const unsubscribe = onAuthStateChanged(
    auth,
    (user) => {
      if (user) {
        onChange({ status: "connected", uid: user.uid });
      } else {
        onChange({ status: "checking" });
      }
    },
    (error) => onChange({ status: "error", message: error.message })
  );

  if (!auth.currentUser) {
    void signInAnonymously(auth).catch((error) =>
      onChange({ status: "error", message: error.message })
    );
  }

  return unsubscribe;
}

export function useAnonymousAuth() {
  const firebaseAvailable = isFirebaseReady();
  const auth = firebaseAvailable ? getFirebaseAuth() : null;
  const db = firebaseAvailable ? getFirestoreDb() : null;
  const [state, setState] = useState<AnonymousAuthState>(() => {
    if (!firebaseAvailable) {
      return {
        status: "unavailable",
        message:
          "Firebase environment variables are missing. Populate .env.local.",
      };
    }
    if (!auth) {
      return {
        status: "unavailable",
        message: "Firebase Auth failed to initialize.",
      };
    }
    return { status: "checking" };
  });

  useEffect(() => {
    if (!auth) {
      return;
    }

    return subscribeToAnonymousAuth(auth, setState);
  }, [auth]);

  return {
    ...state,
    auth,
    db,
    firebaseAvailable,
    uid: state.status === "connected" ? state.uid : null,
  };
}
