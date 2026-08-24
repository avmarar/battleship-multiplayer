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
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";

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

  const isRegistered = auth.status === "connected" && !auth.isAnonymous && auth.email;

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
    <div className="relative">
      <HudButton
        data-testid="account-menu"
        variant={isRegistered ? "gold" : "ghost"}
        className="max-w-[11rem] truncate px-3 py-1 text-xs tracking-normal normal-case md:text-sm font-mono shadow-sm"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">
          {isRegistered ? `★ ${auth.email}` : "👤 Guest Officer"}
        </span>
      </HudButton>

      {open && (
        <HudPanel
          corners
          tone={isRegistered ? "gold" : "accent"}
          className="absolute right-0 z-50 mt-2 w-80 p-5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150"
          data-testid="account-panel"
        >
          {isRegistered ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <span className="text-xl">🎖️</span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] font-mono text-amber-300">
                    AUTHENTICATED OFFICER
                  </p>
                  <p className="font-bold text-white truncate text-sm">{auth.email}</p>
                </div>
              </div>
              <p className="text-xs text-white/70">
                Your combat records and win/loss ratio are permanently saved to the global leaderboard.
              </p>
              <HudButton
                data-testid="account-sign-out"
                disabled={busy}
                variant="secondary"
                fullWidth
                onClick={() => void handleSignOut()}
              >
                Sign out to Guest
              </HudButton>
            </div>
          ) : (
            <form
              className="space-y-3.5"
              onSubmit={(event) => void handleRegister(event)}
            >
              <div className="border-b border-white/10 pb-2.5">
                <p className="text-xs uppercase tracking-[0.2em] font-mono text-cyan-200">
                  PERSISTENT LOGIN & RANK
                </p>
                <p className="text-xs text-white/60 mt-0.5">
                  Save your call sign on the scoreboard
                </p>
              </div>

              <input
                type="email"
                name="email"
                data-testid="account-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="min-h-[42px] w-full rounded-[var(--radius-hud)] border border-cyan-500/30 bg-black/40 px-3.5 py-2 text-sm text-white outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,242,254,0.25)]"
              />
              <input
                type="password"
                name="password"
                data-testid="account-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password (6+ characters)"
                className="min-h-[42px] w-full rounded-[var(--radius-hud)] border border-cyan-500/30 bg-black/40 px-3.5 py-2 text-sm text-white outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,242,254,0.25)]"
              />
              <div className="flex gap-2 pt-1">
                <HudButton
                  type="submit"
                  data-testid="account-register"
                  disabled={busy}
                  className="flex-1 px-3 text-xs"
                >
                  Save Account
                </HudButton>
                <HudButton
                  data-testid="account-sign-in"
                  disabled={busy}
                  variant="ghost"
                  className="flex-1 px-3 text-xs"
                  onClick={() => void handleSignIn()}
                >
                  Sign In
                </HudButton>
              </div>
            </form>
          )}
        </HudPanel>
      )}
    </div>
  );
}
