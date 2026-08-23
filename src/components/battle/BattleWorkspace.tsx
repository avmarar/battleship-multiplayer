"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { BattleGrid, type CellMark } from "@/components/grid/BattleGrid";
import { MatchSummaryCard } from "@/components/scoreboard/MatchSummaryCard";
import { activeShooterId } from "@/lib/games/combat";
import { fireShot } from "@/lib/games/fireShot";
import { skipDisconnectedTurn } from "@/lib/games/skipTurn";
import { opponentTeam, teamForPlayer } from "@/lib/games/matchmaking";
import {
  GAMES_COLLECTION,
  GAME_TEAMS_COLLECTION,
  type GameDocument,
  type GameTeamDocument,
  type GameTeamId,
} from "@/lib/games/types";
import { useAnonymousAuth } from "@/lib/firebase/useAnonymousAuth";
import { isGridCoordinate, type GridCoordinate } from "@/lib/grid/coordinates";
import { recordMatchStats } from "@/lib/leaderboard/recordMatchStats";
import { buildMatchSummary } from "@/lib/leaderboard/summary";
import { canSkipDisconnected, skipCountdownMs } from "@/lib/presence/stale";
import { DISCONNECT_SKIP_MS } from "@/lib/presence/types";
import { usePresence } from "@/lib/presence/usePresence";
import { usePresenceDoc } from "@/lib/presence/usePresenceDoc";

type BattleWorkspaceProps = {
  gameId: string;
};

export function BattleWorkspace({ gameId }: BattleWorkspaceProps) {
  const auth = useAnonymousAuth();
  const [game, setGame] = useState<GameDocument | null>(null);
  const [myTeamDoc, setMyTeamDoc] = useState<GameTeamDocument | null>(null);
  const [enemyTeamDoc, setEnemyTeamDoc] = useState<GameTeamDocument | null>(
    null
  );
  const [myTeam, setMyTeam] = useState<GameTeamId | null>(null);
  const [selected, setSelected] = useState<GridCoordinate | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firing, setFiring] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const uid = auth.uid;
  const db = auth.db;
  const shooter = game ? activeShooterId(game) : null;
  const isMyTurn = !!uid && shooter === uid;
  const ended = game?.status === "ENDED";
  const shooterPresence = usePresenceDoc(db, ended ? null : shooter);

  usePresence({
    db,
    uid,
    gameId,
    accountType: auth.isAnonymous ? "guest" : "registered",
  });

  useEffect(() => {
    if (!db || !gameId || !uid) {
      return;
    }
    return onSnapshot(
      doc(db, GAMES_COLLECTION, gameId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setErrorMessage("Match was closed.");
          return;
        }
        const data = snapshot.data() as GameDocument;
        setGame(data);
        setMyTeam(teamForPlayer(data, uid));
      },
      (error) => setErrorMessage(error.message)
    );
  }, [db, gameId, uid]);

  useEffect(() => {
    if (!db || !gameId || !myTeam) {
      return;
    }
    const enemy = opponentTeam(myTeam);
    const unsubMine = onSnapshot(
      doc(db, GAMES_COLLECTION, gameId, GAME_TEAMS_COLLECTION, myTeam),
      (snapshot) => {
        if (snapshot.exists()) {
          setMyTeamDoc(snapshot.data() as GameTeamDocument);
        }
      }
    );
    const unsubEnemy = onSnapshot(
      doc(db, GAMES_COLLECTION, gameId, GAME_TEAMS_COLLECTION, enemy),
      (snapshot) => {
        if (snapshot.exists()) {
          setEnemyTeamDoc(snapshot.data() as GameTeamDocument);
        }
      }
    );
    return () => {
      unsubMine();
      unsubEnemy();
    };
  }, [db, gameId, myTeam]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!db || !uid || !ended || game?.statsRecorded) {
      return;
    }
    void recordMatchStats(db, gameId, uid).catch(() => undefined);
  }, [db, uid, ended, game?.statsRecorded, gameId]);

  const homeMarks = useMemo(() => {
    const marks: Partial<Record<GridCoordinate, CellMark>> = {};
    for (const ship of myTeamDoc?.ships ?? []) {
      for (const coordinate of ship.coordinates) {
        marks[coordinate] =
          ship.hits >= ship.size ? "hit" : ship.hits > 0 ? "hit" : "ship";
      }
    }
    return marks;
  }, [myTeamDoc]);

  const targetMarks = useMemo(() => {
    const marks: Partial<Record<GridCoordinate, CellMark>> = {};
    const shots = new Set(myTeamDoc?.shotsFired ?? []);
    for (const ship of enemyTeamDoc?.ships ?? []) {
      for (const coordinate of ship.coordinates) {
        if (!shots.has(coordinate)) {
          continue;
        }
        marks[coordinate as GridCoordinate] =
          ship.hits >= ship.size ? "sunk" : "hit";
      }
    }
    for (const shot of myTeamDoc?.shotsFired ?? []) {
      if (isGridCoordinate(shot) && !marks[shot]) {
        marks[shot] = "miss";
      }
    }
    if (selected) {
      marks[selected] = marks[selected] ?? "preview-valid";
    }
    return marks;
  }, [enemyTeamDoc, myTeamDoc, selected]);

  const handleFire = async () => {
    if (!db || !uid || !selected || !isMyTurn || firing || ended) {
      return;
    }
    setFiring(true);
    setErrorMessage(null);
    try {
      const result = await fireShot(db, gameId, uid, selected);
      setSelected(null);
      if (result.ended) {
        setStatusMessage(`Victory! Team ${result.winnerTeam} wins.`);
      } else {
        setStatusMessage(`${result.outcome} at ${result.coordinate}.`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to fire."
      );
    } finally {
      setFiring(false);
    }
  };

  const handleSkip = async () => {
    if (!db || !uid || ended || skipping || isMyTurn) {
      return;
    }
    setSkipping(true);
    setErrorMessage(null);
    try {
      await skipDisconnectedTurn(db, gameId, uid);
      setStatusMessage("Disconnected shooter skipped.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to skip."
      );
    } finally {
      setSkipping(false);
    }
  };

  const summary =
    game && myTeam
      ? buildMatchSummary(game, myTeam, myTeamDoc, enemyTeamDoc)
      : null;
  const skipReady = canSkipDisconnected(
    shooterPresence,
    nowMs,
    DISCONNECT_SKIP_MS
  );
  const skipWaitSec = Math.ceil(
    skipCountdownMs(shooterPresence?.lastSeenAt, nowMs, DISCONNECT_SKIP_MS) /
      1000
  );

  if (auth.status === "checking") {
    return (
      <p className="text-white/70" data-testid="battle-loading">
        Connecting…
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="battle-workspace">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
          Battle
        </p>
        <h1 className="text-3xl font-semibold text-white">Fire Control</h1>
        <p className="text-sm text-white/70" data-testid="battle-turn">
          {ended
            ? `Match ended. Winner: ${game?.winnerTeam ?? "—"}`
            : isMyTurn
              ? "Your turn — select a cell and fire."
              : "Waiting for the active shooter…"}
        </p>
      </header>

      {summary && <MatchSummaryCard summary={summary} />}

      {!ended && !isMyTurn && shooter && (
        <div
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
          data-testid="skip-turn-panel"
        >
          {skipReady ? (
            <button
              type="button"
              data-testid="skip-disconnected"
              disabled={skipping}
              onClick={() => void handleSkip()}
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-[#041218] disabled:opacity-50"
            >
              {skipping ? "Skipping…" : "Skip disconnected shooter"}
            </button>
          ) : (
            <p data-testid="skip-countdown">
              Shooter disconnected? Skip available in {skipWaitSec}s.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-[0.2em] text-cyan-100">
            Your fleet
          </h2>
          <BattleGrid marks={homeMarks} />
        </section>
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-[0.2em] text-cyan-100">
            Target grid
          </h2>
          <BattleGrid
            marks={targetMarks}
            selectedCoordinate={selected}
            onSelect={(coordinate) => {
              if (!isMyTurn || ended) {
                return;
              }
              if (myTeamDoc?.shotsFired.includes(coordinate)) {
                return;
              }
              setSelected(coordinate);
            }}
            disabled={!isMyTurn || ended}
          />
          <button
            type="button"
            data-testid="fire-shot"
            disabled={!selected || !isMyTurn || firing || ended}
            onClick={() => void handleFire()}
            className="rounded-full bg-linear-to-r from-cyan-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-[#04101b] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {firing ? "Firing…" : "Fire"}
          </button>
        </section>
      </div>

      {statusMessage && (
        <p className="text-sm text-emerald-300" data-testid="battle-status">
          {statusMessage}
        </p>
      )}
      {errorMessage && (
        <p className="text-sm text-red-300">{errorMessage}</p>
      )}
      <div className="flex flex-wrap gap-4">
        <Link href="/lobby" className="text-sm font-semibold text-cyan-100">
          ← Lobby
        </Link>
        {ended && (
          <Link
            href={`/scoreboard?gameId=${gameId}`}
            className="text-sm font-semibold text-cyan-100"
            data-testid="battle-scoreboard-link"
          >
            Match summary →
          </Link>
        )}
      </div>
    </div>
  );
}
