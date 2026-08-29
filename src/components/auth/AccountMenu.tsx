"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
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

type AuthMode = "register" | "signin";

export function AccountMenu() {
  const auth = useAnonymousAuth();
  const { pushToast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close popup modal on Escape key press
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (auth.status === "unavailable" || auth.status === "checking") {
    return null;
  }

  const isRegistered = auth.status === "connected" && !auth.isAnonymous && auth.email;

  const handleRegister = async (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
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

  const handleSignIn = async (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
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
      setOpen(false);
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Unable to sign out.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const modalContent = open ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        className="w-full max-w-md animate-in zoom-in-95 duration-200"
        data-testid="account-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <HudPanel
          corners
          tone={isRegistered ? "gold" : "accent"}
          className="relative overflow-hidden bg-[#071324] border-cyan-500/40 p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(0,242,254,0.25),inset_0_1px_0_rgba(255,255,255,0.12)] text-white"
        >
          {/* Top Decorative Scanning Line */}
          <div
            className={[
              "absolute top-0 inset-x-0 h-[2px]",
              isRegistered
                ? "bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_#f59e0b]"
                : "bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00f2fe]",
            ].join(" ")}
          />

          {/* Modal Header */}
          <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span
                    className={[
                      "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                      isRegistered ? "bg-amber-400" : "bg-cyan-400",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "relative inline-flex h-2.5 w-2.5 rounded-full",
                      isRegistered
                        ? "bg-amber-400 shadow-[0_0_10px_#f59e0b]"
                        : "bg-cyan-400 shadow-[0_0_10px_#00f2fe]",
                    ].join(" ")}
                  />
                </span>
                <p
                  className={[
                    "text-[10px] uppercase tracking-[0.25em] font-mono font-bold",
                    isRegistered ? "text-amber-300" : "text-cyan-300",
                  ].join(" ")}
                >
                  {isRegistered
                    ? "COMMISSIONED OFFICER DOSSIER"
                    : "FLEET COMMANDER TERMINAL"}
                </p>
              </div>
              <h2
                id="account-modal-title"
                className="text-lg sm:text-xl font-black uppercase tracking-[0.05em] text-white"
              >
                {isRegistered
                  ? "Fleet Profile & Clearance"
                  : mode === "register"
                    ? "Save Officer Account"
                    : "Officer Sign In"}
              </h2>
            </div>

            {/* Close Button */}
            <button
              type="button"
              data-testid="account-close"
              aria-label="Close login popup"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400"
              onClick={() => setOpen(false)}
            >
              <span className="text-sm font-mono leading-none">✕</span>
            </button>
          </div>

          {/* Modal Body */}
          {isRegistered ? (
            <div className="space-y-5">
              {/* Officer Stats Card */}
              <div className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-black/40 to-black/60 p-4 sm:p-5 space-y-3.5 shadow-[inset_0_1px_0_rgba(245,158,11,0.2)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/10 text-2xl shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                    🎖️
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-mono font-semibold text-amber-300/80">
                      AUTHENTICATED CALL SIGN
                    </p>
                    <p className="font-mono font-bold text-white text-base truncate">
                      {auth.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-500/20 text-xs">
                  <div className="rounded-lg bg-black/40 p-2.5 border border-amber-500/10">
                    <span className="block text-[9px] uppercase tracking-wider font-mono text-amber-200/60">
                      Clearance
                    </span>
                    <span className="font-semibold text-amber-300 text-xs">Level 5 Officer</span>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2.5 border border-amber-500/10">
                    <span className="block text-[9px] uppercase tracking-wider font-mono text-amber-200/60">
                      Leaderboard
                    </span>
                    <span className="font-semibold text-emerald-400 text-xs">Permanent UID</span>
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed pt-1">
                  Your battle victories, squadron stats, and win/loss records are permanently tied to this email.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <HudButton
                  data-testid="account-sign-out"
                  disabled={busy}
                  variant="secondary"
                  fullWidth
                  onClick={() => void handleSignOut()}
                  className="py-2.5 text-xs font-mono"
                >
                  {busy ? "Signing Out..." : "Sign Out to Guest"}
                </HudButton>
                <HudButton
                  variant="ghost"
                  fullWidth
                  onClick={() => setOpen(false)}
                  className="py-2.5 text-xs font-mono"
                >
                  Close Dossier
                </HudButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Register / Sign In Segmented Toggle */}
              <div
                role="tablist"
                aria-label="Authentication Mode"
                className="grid grid-cols-2 rounded-lg border border-cyan-500/30 bg-black/50 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-register"
                  aria-selected={mode === "register"}
                  data-testid="account-tab-register"
                  onClick={() => setMode("register")}
                  className={[
                    "rounded-md py-2 px-2 text-center text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200",
                    mode === "register"
                      ? "bg-gradient-to-r from-[#00CED1] to-[#00F2FE] text-[#041218] shadow-[0_0_15px_rgba(0,242,254,0.45)]"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  Save / Link UID
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-signin"
                  aria-selected={mode === "signin"}
                  data-testid="account-tab-signin"
                  onClick={() => setMode("signin")}
                  className={[
                    "rounded-md py-2 px-2 text-center text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200",
                    mode === "signin"
                      ? "bg-gradient-to-r from-[#00CED1] to-[#00F2FE] text-[#041218] shadow-[0_0_15px_rgba(0,242,254,0.45)]"
                      : "text-white/60 hover:text-white hover:bg-white/5",
                  ].join(" ")}
                >
                  Sign In
                </button>
              </div>

              {/* Contextual Briefing Card based on Toggle */}
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-950/30 p-3 text-xs text-white/80 leading-relaxed shadow-[inset_0_1px_0_rgba(0,242,254,0.1)]">
                <div className="flex items-start gap-2.5">
                  <span className="text-cyan-400 text-sm mt-0.5">
                    {mode === "register" ? "⚓" : "🔑"}
                  </span>
                  <div>
                    <p className="font-semibold text-cyan-300 font-mono text-[11px] uppercase tracking-wider">
                      {mode === "register"
                        ? "Save & Link Guest Session"
                        : "Resume Existing Commission"}
                    </p>
                    <p className="text-white/70 text-[11px] mt-0.5 leading-normal">
                      {mode === "register"
                        ? "Registers your email to this guest session so your UID and match score stay permanently saved on the global leaderboard."
                        : "Sign in with your existing email and password to resume your rank and fleet command stats."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auth Form */}
              <form
                className="space-y-3.5"
                onSubmit={(event) => {
                  if (mode === "signin") {
                    void handleSignIn(event);
                  } else {
                    void handleRegister(event);
                  }
                }}
              >
                <div>
                  <label
                    htmlFor="account-email-input"
                    className="block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-200/80 mb-1"
                  >
                    Call Sign / Email Address
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-cyan-400/60 font-mono">
                      ✉
                    </span>
                    <input
                      id="account-email-input"
                      type="email"
                      name="email"
                      data-testid="account-email"
                      value={email}
                      autoFocus
                      required
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="commander@battleship.navy"
                      className="min-h-[44px] w-full rounded-[var(--radius-hud)] border border-cyan-500/40 bg-black/60 pl-9 pr-4 py-2 text-sm text-white placeholder-white/25 outline-none transition focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(0,242,254,0.35)] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="account-password-input"
                    className="block text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-200/80 mb-1"
                  >
                    Security Key / Password (6+ characters)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-cyan-400/60 font-mono">
                      🔒
                    </span>
                    <input
                      id="account-password-input"
                      type="password"
                      name="password"
                      data-testid="account-password"
                      value={password}
                      required
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••••••"
                      className="min-h-[44px] w-full rounded-[var(--radius-hud)] border border-cyan-500/40 bg-black/60 pl-9 pr-4 py-2 text-sm text-white placeholder-white/25 outline-none transition focus:border-cyan-300 focus:shadow-[0_0_15px_rgba(0,242,254,0.35)] font-mono"
                    />
                  </div>
                </div>

                {/* Single Primary Action Button matching the active toggle selection */}
                <div className="pt-2 space-y-2.5">
                  {mode === "register" ? (
                    <HudButton
                      type="submit"
                      data-testid="account-register"
                      disabled={busy}
                      variant="primary"
                      fullWidth
                      className="py-3 text-xs font-mono font-bold shadow-[0_0_20px_rgba(0,242,254,0.35)]"
                    >
                      {busy ? "Saving Account..." : "Save Account (Link UID)"}
                    </HudButton>
                  ) : (
                    <HudButton
                      type="submit"
                      data-testid="account-sign-in"
                      disabled={busy}
                      variant="primary"
                      fullWidth
                      className="py-3 text-xs font-mono font-bold shadow-[0_0_20px_rgba(0,242,254,0.35)]"
                    >
                      {busy ? "Signing In..." : "Sign In to Fleet"}
                    </HudButton>
                  )}

                  {/* Switch toggle prompt at bottom */}
                  <div className="flex justify-center items-center pt-1 text-[11px] text-white/50">
                    <button
                      type="button"
                      onClick={() => setMode(mode === "register" ? "signin" : "register")}
                      className="font-mono text-cyan-300 hover:text-cyan-100 underline decoration-cyan-500/40 transition"
                    >
                      {mode === "register"
                        ? "Already have an account? Switch to Sign In →"
                        : "Need to link this guest session? Switch to Save Account →"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </HudPanel>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Header Trigger Button */}
      <HudButton
        data-testid="account-menu"
        variant={isRegistered ? "gold" : "ghost"}
        className="max-w-[13rem] truncate px-3 py-1.5 text-xs tracking-normal normal-case md:text-sm font-mono shadow-sm transition hover:shadow-[0_0_15px_rgba(0,206,209,0.3)]"
        onClick={() => setOpen(true)}
      >
        <span className="truncate flex items-center gap-1.5">
          {isRegistered ? (
            <>
              <span className="text-amber-400">★</span>
              <span className="truncate">{auth.email}</span>
            </>
          ) : (
            <>
              <span className="text-cyan-400">👤</span>
              <span className="truncate">Guest Officer</span>
            </>
          )}
        </span>
      </HudButton>

      {/* Render Modal via Portal at document.body level */}
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
