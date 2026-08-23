"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAnonymousAuth } from "@/lib/firebase/useAnonymousAuth";
import {
  findActiveGame,
  resumeHref,
  type ActiveGame,
} from "@/lib/presence/findActiveGame";

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
    <div
      className="rounded-3xl border border-cyan-400/40 bg-cyan-400/10 p-6"
      data-testid="resume-match"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
        Reconnect
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">
        You have a match in {game.status.toLowerCase()}
      </h2>
      <p className="mt-2 text-sm text-white/70">
        Restore the live board and continue from the last committed state.
      </p>
      <Link
        href={resumeHref(game)}
        data-testid="resume-match-link"
        className="mt-4 inline-flex rounded-full bg-[#00CED1] px-5 py-2 text-sm font-semibold text-[#041218]"
      >
        Resume match →
      </Link>
    </div>
  );
}
