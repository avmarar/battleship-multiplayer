'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import {
  getFirebaseAuth,
  getFirestoreDb,
  isFirebaseReady,
} from "@/lib/firebase/client";

type ProfileDocument = {
  nickname?: string;
  statusMessage?: string;
  environment?: string;
  lastClientUpdate?: string;
  updatedAt?: Timestamp;
};

type AuthState =
  | { status: "checking" }
  | { status: "error"; message: string }
  | { status: "connected"; uid: string };

const artifactsCollection =
  process.env.NEXT_PUBLIC_FIREBASE_ARTIFACTS_COLLECTION ?? "artifacts";
const namespace =
  process.env.NEXT_PUBLIC_APP_NAMESPACE ?? "dev-squadron-prototype";
const defaultStatusMessage = "Awaiting fleet orders.";

export default function Home() {
  const firebaseAvailable = isFirebaseReady();
  const firebaseAuth = firebaseAvailable ? getFirebaseAuth() : null;
  const firestoreDb = firebaseAvailable ? getFirestoreDb() : null;
  const [authState, setAuthState] = useState<AuthState>(
    !firebaseAvailable
      ? {
          status: "error",
          message:
            "Firebase environment variables are missing. Populate .env.local.",
        }
      : !firebaseAuth
        ? { status: "error", message: "Firebase Auth failed to initialize." }
        : { status: "checking" }
  );
  const [profile, setProfile] = useState<ProfileDocument | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [statusInput, setStatusInput] = useState(defaultStatusMessage);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const hydrateFormRef = useRef(false);

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        if (user) {
          setAuthState({ status: "connected", uid: user.uid });
        } else {
          setAuthState({ status: "checking" });
        }
      },
      (error) => {
        setAuthState({ status: "error", message: error.message });
      }
    );

    if (!firebaseAuth.currentUser) {
      signInAnonymously(firebaseAuth).catch((error) =>
        setAuthState({ status: "error", message: error.message })
      );
    }

    return () => unsubscribe();
  }, [firebaseAuth]);

  const connectedUid = authState.status === "connected" ? authState.uid : null;
  const shouldSubscribeToProfile = firebaseAvailable && !!connectedUid;

  useEffect(() => {
    if (!shouldSubscribeToProfile || !connectedUid) {
      return;
    }

    if (!firestoreDb) {
      return;
    }

    const profileDocRef = doc(
      firestoreDb,
      artifactsCollection,
      namespace,
      "users",
      connectedUid,
      "data",
      "profile"
    );

    const unsubscribe = onSnapshot(
      profileDocRef,
      (snapshot) => {
        setProfileError(null);
        if (snapshot.exists()) {
          const data = snapshot.data() as ProfileDocument;
          setProfile(data);
          if (!hydrateFormRef.current) {
            setNicknameInput(data.nickname ?? "");
            setStatusInput(data.statusMessage ?? defaultStatusMessage);
            hydrateFormRef.current = true;
          }
        } else {
          setProfile(null);
          if (!hydrateFormRef.current) {
            setNicknameInput("");
            setStatusInput(defaultStatusMessage);
          }
        }
      },
      (error) => setProfileError(error.message)
    );

    return () => unsubscribe();
  }, [shouldSubscribeToProfile, connectedUid, firestoreDb]);

  useEffect(() => {
    if (!shouldSubscribeToProfile) {
      hydrateFormRef.current = false;
    }
  }, [shouldSubscribeToProfile]);

  const visibleProfile = shouldSubscribeToProfile ? profile : null;

  const docPathDisplay = useMemo(() => {
    if (authState.status !== "connected") {
      return "artifacts/.../users/.../data/profile";
    }

    return `artifacts/${namespace}/users/${authState.uid}/data/profile`;
  }, [authState]);

  const lastUpdatedDisplay = (() => {
    if (!visibleProfile?.updatedAt) {
      return "—";
    }
    if (visibleProfile.updatedAt instanceof Timestamp) {
      return visibleProfile.updatedAt.toDate().toLocaleString();
    }
    return "—";
  })();

  const heroStatus = [
    {
      label: "Firebase Config",
      value: firebaseAvailable ? "Ready" : "Missing",
    },
    {
      label: "Auth Status",
      value:
        authState.status === "connected"
          ? "Anonymous UID issued"
          : authState.status === "error"
            ? "Error"
            : "Connecting…",
    },
    {
      label: "Data Path",
      value: docPathDisplay,
    },
    {
      label: "Last Sync",
      value: lastUpdatedDisplay,
    },
  ];

  const derivedProfileError =
    !firestoreDb && shouldSubscribeToProfile
      ? "Firestore is unavailable. Check configuration."
      : profileError;

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firebaseAvailable || authState.status !== "connected") {
      return;
    }

    const db = getFirestoreDb();
    if (!db) {
      setSaveState("error");
      setProfileError("Firestore is unavailable. Check configuration.");
      return;
    }

    const trimmedNickname = nicknameInput.trim();
    const trimmedStatus = statusInput.trim();

    if (!trimmedNickname) {
      setProfileError("Nickname is required.");
      return;
    }

    setSaveState("saving");
    setProfileError(null);

    try {
      const profileDocRef = doc(
        db,
        artifactsCollection,
        namespace,
        "users",
        authState.uid,
        "data",
        "profile"
      );

      await setDoc(
        profileDocRef,
        {
          nickname: trimmedNickname,
          statusMessage: trimmedStatus || defaultStatusMessage,
          environment: process.env.NODE_ENV,
          lastClientUpdate: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const authInstance = getFirebaseAuth();
      if (authInstance?.currentUser) {
        await updateProfile(authInstance.currentUser, {
          displayName: trimmedNickname,
        }).catch(() => undefined);
      }

      setSaveState("success");
      setLastSavedAt(new Date());
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (error) {
      setSaveState("error");
      const message =
        error instanceof Error ? error.message : "Failed to save profile.";
      setProfileError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030614] via-[#060b1f] to-[#010103] px-4 py-10">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <section className="space-y-6 rounded-3xl border border-white/5 bg-white/5 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-sm text-white/80">
            Sprint 1 · Architecture Foundation
          </p>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Battleship Multiplayer: Real-time Auth & Data PoC
            </h1>
            <p className="max-w-2xl text-base text-white/70">
              This workspace verifies our Firebase wiring: anonymous sign-in,
              real-time Firestore listeners, and a responsive prototype of the
              tactical command screen. Configure <code>.env.local</code>, run
              the dev server, and see the UID + profile data stream in live.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <button className="rounded-full bg-cyan-500/90 px-5 py-2 font-medium text-[#021019] hover:bg-cyan-400">
              Quick Play (Stub)
            </button>
            <button className="rounded-full border border-white/20 px-5 py-2 font-medium text-white hover:border-white/40">
              View Sprint 1 Plan
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {heroStatus.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-white/80"
              >
                <p className="text-xs uppercase tracking-wide text-white/50">
                  {item.label}
                </p>
                <p className="mt-2 font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {!firebaseAvailable && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-100">
            Firebase configuration is missing. Duplicate{" "}
            <code>.env.local.example</code>, populate your project credentials,
            and restart the dev server.
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleProfileSave}
            className="space-y-6 rounded-3xl border border-white/5 bg-[#040a1c]/80 p-6 shadow-xl shadow-black/40"
          >
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">
                Call sign
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Configure your session identity
              </h2>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">Nickname *</span>
              <input
                type="text"
                value={nicknameInput}
                onChange={(event) => setNicknameInput(event.target.value)}
                placeholder="e.g. Captain Aurora"
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm text-white/70">Status Message</span>
              <textarea
                value={statusInput}
                onChange={(event) => setStatusInput(event.target.value)}
                rows={4}
                className="resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={
                  !firebaseAvailable ||
                  authState.status !== "connected" ||
                  saveState === "saving"
                }
                className="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-2 font-semibold text-[#04101b] outline-none transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "success"
                    ? "Saved!"
                    : "Update Profile"}
              </button>
              {lastSavedAt && (
                <span className="text-xs text-white/60">
                  Last saved {lastSavedAt.toLocaleTimeString()}
                </span>
              )}
            </div>
            {derivedProfileError && (
              <p className="text-sm text-red-300">{derivedProfileError}</p>
            )}
          </form>

          <div className="space-y-5 rounded-3xl border border-white/5 bg-white/[0.04] p-6">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                Telemetry
              </p>
              <h2 className="text-2xl font-semibold text-white">
                Real-time Firestore feed
              </h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
              <p className="text-white/60">Document Path</p>
              <p className="font-mono text-xs text-cyan-200">{docPathDisplay}</p>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between rounded-2xl border border-white/10 bg-black/10 p-3">
                <dt className="text-white/60">Nickname</dt>
                <dd className="font-semibold text-white">
              {visibleProfile?.nickname ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between rounded-2xl border border-white/10 bg-black/10 p-3">
                <dt className="text-white/60">Status Message</dt>
                <dd className="max-w-[60%] text-right text-white">
                  {visibleProfile?.statusMessage ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between rounded-2xl border border-white/10 bg-black/10 p-3">
                <dt className="text-white/60">Environment</dt>
                <dd className="font-semibold text-white">
                  {visibleProfile?.environment ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between rounded-2xl border border-white/10 bg-black/10 p-3">
                <dt className="text-white/60">Last Updated</dt>
                <dd className="font-semibold text-white">{lastUpdatedDisplay}</dd>
              </div>
            </dl>
            <div className="rounded-2xl border border-white/10 bg-cyan-500/10 p-4 text-sm text-cyan-50">
              <p className="font-semibold">Realtime Listener</p>
              <p>
                {visibleProfile
                  ? "Snapshot listener active – updates propagate instantly."
                  : authState.status === "connected"
                    ? "Document not created yet. Save your profile to start syncing."
                    : "Waiting for authentication before subscribing."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/5 bg-black/30 p-6 text-sm text-white/70">
          <h3 className="text-lg font-semibold text-white">
            Sprint 1 Completion Checklist
          </h3>
          <ul className="mt-4 space-y-2">
            <li>✅ Firebase project scaffolding & SDK integration.</li>
            <li>✅ Anonymous authentication + UID display.</li>
            <li>✅ Private Firestore write + onSnapshot listener.</li>
            <li>
              ✅ Static tactical home screen matching the UX blueprint
              (Quick&nbsp;Play stub).
            </li>
            <li>⬜️ CI/CD wiring (scheduled for the end of Sprint&nbsp;1).</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
