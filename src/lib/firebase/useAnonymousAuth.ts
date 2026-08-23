"use client";

import { useEffect, useState } from "react";
import {
  onIdTokenChanged,
  type Auth,
  type User,
} from "firebase/auth";
import {
  ensureAnonymousSignIn,
  getFirebaseAuth,
  getFirestoreDb,
  isFirebaseReady,
} from "./client";
import { isEmailAccount } from "./account";

export type AnonymousAuthState =
  | { status: "unavailable"; message: string }
  | { status: "checking" }
  | { status: "error"; message: string }
  | {
      status: "connected";
      uid: string;
      email: string | null;
      isAnonymous: boolean;
    };

function connectedState(user: User): Extract<AnonymousAuthState, { status: "connected" }> {
  return {
    status: "connected",
    uid: user.uid,
    email: user.email ?? null,
    isAnonymous: !isEmailAccount(user),
  };
}

export function subscribeToAnonymousAuth(
  auth: Auth,
  onChange: (state: AnonymousAuthState) => void
) {
  const unsubscribe = onIdTokenChanged(
    auth,
    (user) => {
      if (user) {
        onChange(connectedState(user));
        return;
      }
      onChange({ status: "checking" });
    },
    (error) => onChange({ status: "error", message: error.message })
  );

  void auth
    .authStateReady()
    .then(() => {
      if (!auth.currentUser) {
        return ensureAnonymousSignIn(auth);
      }
    })
    .catch((error) =>
      onChange({
        status: "error",
        message:
          error instanceof Error ? error.message : "Anonymous sign-in failed.",
      })
    );

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
    email: state.status === "connected" ? state.email : null,
    isAnonymous: state.status === "connected" ? state.isAnonymous : true,
  };
}
