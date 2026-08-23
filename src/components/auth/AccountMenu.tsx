"use client";

import { useState, type FormEvent } from "react";
import {
  registerWithEmail,
  signInWithEmail,
  signOutToGuest,
} from "@/lib/firebase/account";
import { useAnonymousAuth } from "@/lib/firebase/useAnonymousAuth";
import { stampAccountType } from "@/lib/profile/accountType";
import { useToast } from "@/components/feedback/ToastProvider";

export function AccountMenu() {
  const auth = useAnonymousAuth();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (auth.status === "unavailable" || auth.status === "checking") {
    return null;
  }

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    if (!auth.auth) {
      return;
    }
    setBusy(true);
    try {
      const credential = await registerWithEmail(auth.auth, email, password);
      if (auth.db && credential.user.uid) {
        await stampAccountType(auth.db, credential.user.uid, "registered");
      }
      pushToast("Account saved. This UID stays on the leaderboard.", "success");
      setOpen(false);
      setPassword("");
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Unable to register.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async () => {
    if (!auth.auth) {
      return;
    }
    setBusy(true);
    try {
      const credential = await signInWithEmail(auth.auth, email, password);
      if (auth.db && credential.user.uid) {
        await stampAccountType(auth.db, credential.user.uid, "registered");
      }
      pushToast("Signed in.", "success");
      setOpen(false);
      setPassword("");
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Unable to sign in.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth.auth) {
      return;
    }
    setBusy(true);
    try {
      await signOutToGuest(auth.auth);
      pushToast("Signed out to a guest session.", "info");
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Unable to sign out.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        data-testid="account-menu"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-white/20 px-3 py-1.5 text-sm font-semibold text-cyan-100 hover:border-white/40"
      >
        {auth.status === "connected" && !auth.isAnonymous && auth.email
          ? auth.email
          : "Guest"}
      </button>
      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-[#0b1220] p-4 shadow-xl"
          data-testid="account-panel"
        >
          {auth.status === "connected" && !auth.isAnonymous ? (
            <div className="space-y-3">
              <p className="text-sm text-white/70">
                Signed in as{" "}
                <span className="font-semibold text-white">{auth.email}</span>
              </p>
              <button
                type="button"
                data-testid="account-sign-out"
                disabled={busy}
                onClick={() => void handleSignOut()}
                className="w-full rounded-full border border-white/20 px-3 py-2 text-sm font-semibold text-white"
              >
                Sign out
              </button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(event) => void handleRegister(event)}>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">
                Persistent login
              </p>
              <input
                type="email"
                name="email"
                data-testid="account-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
              <input
                type="password"
                name="password"
                data-testid="account-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password (6+)"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  data-testid="account-register"
                  disabled={busy}
                  className="flex-1 rounded-full bg-[#00CED1] px-3 py-2 text-sm font-semibold text-[#041218]"
                >
                  Save account
                </button>
                <button
                  type="button"
                  data-testid="account-sign-in"
                  disabled={busy}
                  onClick={() => void handleSignIn()}
                  className="flex-1 rounded-full border border-white/20 px-3 py-2 text-sm font-semibold text-white"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
