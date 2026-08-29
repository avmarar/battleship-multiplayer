"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAnonymousAuth } from "@/lib/firebase/useAnonymousAuth";
import {
  findActiveGame,
  resumeHref,
  type ActiveGame,
} from "@/lib/presence/findActiveGame";
import { HudPanel } from "@/components/ui/HudPanel";

export function ResumeMatchCard() {
  const auth = useAnonymousAuth();
  const [game, setGame] = useState<ActiveGame | null>(null);

  useEffect(() => {
    if (!auth.db || !auth.uid) {
      return;
    }
    let cancelled = false;
    void findActiveGame(auth.db, auth.uid)
      .then((active) => {
        if (!cancelled) {
          setGame(active);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGame(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [auth.db, auth.uid]);

  if (!game) {
    return null;
  }

  return (
    <HudPanel
      tone="accent"
      className="p-6 border-cyan-400/50 bg-gradient-to-r from-cyan-950/40 via-[#071324]/80 to-cyan-950/30"
      data-testid="resume-match"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
              ACTIVE SESSION DETECTED
            </p>
          </div>
          <h2 className="text-xl font-bold uppercase tracking-[0.04em] text-white">
            Match in Progress ({game.status.toLowerCase()})
          </h2>
          <p className="text-sm text-white/70">
            Restore the live tactical radar and continue from your last committed turn.
          </p>
        </div>

        <Link
          href={resumeHref(game)}
          data-testid="resume-match-link"
          className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-hud)] bg-gradient-to-r from-[#00CED1] to-[#00F2FE] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.1em] text-[#041218] shadow-[0_0_20px_rgba(0,242,254,0.4)] transition hover:brightness-110 active:scale-95"
        >
          Resume match →
        </Link>
      </div>
    </HudPanel>
  );
}
