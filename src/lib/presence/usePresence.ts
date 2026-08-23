"use client";

import { useEffect } from "react";
import type { Firestore } from "firebase/firestore";
import { PRESENCE_HEARTBEAT_MS } from "./types";
import { writePresence } from "./writePresence";

type UsePresenceOptions = {
  db: Firestore | null;
  uid: string | null;
  gameId?: string | null;
  matchId?: string | null;
};

export function usePresence({ db, uid, gameId, matchId }: UsePresenceOptions) {
  useEffect(() => {
    if (!db || !uid) {
      return;
    }

    let cancelled = false;

    const beat = (isConnected: boolean) => {
      if (cancelled && isConnected) {
        return;
      }
      void writePresence(db, uid, {
        isConnected,
        gameId: gameId ?? null,
        matchId: matchId ?? null,
      }).catch(() => undefined);
    };

    beat(true);
    const interval = window.setInterval(() => beat(true), PRESENCE_HEARTBEAT_MS);

    const onVisibility = () => {
      beat(document.visibilityState === "visible");
    };
    const onUnload = () => {
      beat(false);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onUnload);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onUnload);
      beat(false);
    };
  }, [db, uid, gameId, matchId]);
}
