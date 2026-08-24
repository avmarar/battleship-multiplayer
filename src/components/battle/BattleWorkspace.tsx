"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { BattleGrid, type CellMark } from "@/components/grid/BattleGrid";
import { MatchSummaryCard } from "@/components/scoreboard/MatchSummaryCard";
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";
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
import { fromLockedPayload } from "@/lib/grid/draft";
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

  usePresence({ db, uid, gameId });

  // Store active battle match ID
  useEffect(() => {
    if (gameId && typeof window !== "undefined") {
      try {
        sessionStorage.setItem("battleship_active_game_id", gameId);
      } catch {
        // ignore
      }
    }
  }, [gameId]);

  useEffect(() => {
    if (!db || !gameId || !uid) {
      return;
    }
    return onSnapshot(
      doc(db, GAMES_COLLECTION, gameId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setErrorMessage("Match was closed.");
          try {
            sessionStorage.removeItem("battleship_active_game_id");
          } catch {
            // ignore
          }
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

  const homeShips = useMemo(
    () => fromLockedPayload(myTeamDoc?.ships ?? []),
    [myTeamDoc]
  );

  const sunkIds = useMemo(
    () =>
      (myTeamDoc?.ships ?? [])
        .filter((ship) => ship.hits >= ship.size)
        .map((ship) => ship.type),
    [myTeamDoc]
  );

  const homeMarks = useMemo(() => {
    const marks: Partial<Record<GridCoordinate, CellMark>> = {};
    for (const ship of myTeamDoc?.ships ?? []) {
      for (const coordinate of ship.coordinates) {
        if (ship.hits >= ship.size) {
          marks[coordinate] = "sunk";
        } else if (ship.hits > 0) {
          marks[coordinate] = "hit";
        }
        // Intact hull cells stay clear — FleetOverlay draws the ship SVG.
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
      <div className="flex items-center justify-center p-12" data-testid="battle-loading">
        <div className="flex items-center gap-3 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-6 py-3 text-cyan-200 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
          <span className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono text-sm uppercase tracking-widest">ESTABLISHING FIRE CONTROL LINK…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7" data-testid="battle-workspace">
      {/* Header & Turn Status Banner */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
              TACTICAL BATTLE SECTOR · LIVE ENGAGEMENT
            </p>
          </div>
          {myTeam && (
            <span className="rounded-full border border-cyan-400/40 bg-cyan-950/50 px-3.5 py-1 text-xs font-mono font-bold text-cyan-200 shadow-[0_0_10px_rgba(0,242,254,0.2)]">
              YOUR FLEET: TEAM {myTeam}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-black uppercase tracking-[0.04em] text-white sm:text-4xl">
            Fire Control Bridge
          </h1>

          {!ended ? (
            <div
              className={[
                "inline-flex min-h-[48px] items-center gap-2.5 rounded-[var(--radius-hud)] border px-6 py-2.5 text-base font-black uppercase tracking-[0.15em] transition-all duration-300",
                isMyTurn
                  ? "anim-turn-pulse border-cyan-300 bg-cyan-950/60 text-cyan-200 shadow-[0_0_25px_rgba(0,242,254,0.5)]"
                  : "border-rose-500/70 bg-rose-950/30 text-rose-300 shadow-[0_0_15px_rgba(255,46,99,0.2)]",
              ].join(" ")}
              data-testid="battle-turn"
            >
              <span
                className={[
                  "h-2.5 w-2.5 rounded-full",
                  isMyTurn ? "bg-cyan-400 animate-ping" : "bg-rose-500",
                ].join(" ")}
              />
              {isMyTurn ? "🎯 Your Turn · Select Target" : "⏳ Opponent Targeting…"}
            </div>
          ) : (
            <div className="rounded-[var(--radius-hud)] border border-white/20 bg-black/50 px-5 py-2 text-sm font-mono font-bold text-white shadow-lg" data-testid="battle-turn">
              ENGAGEMENT ENDED · WINNER: TEAM {game?.winnerTeam ?? "—"}
            </div>
          )}
        </div>
      </header>

      {summary && <MatchSummaryCard summary={summary} />}

      {/* Disconnect Skip Banner */}
      {!ended && !isMyTurn && shooter && (
        <HudPanel
          corners
          className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-sm text-white/80"
          data-testid="skip-turn-panel"
        >
          <div className="flex items-center gap-2 text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-xs">DISCONNECT TELEMETRY:</span>
            {!skipReady ? (
              <p data-testid="skip-countdown" className="text-xs text-white/70">
                Shooter inactive? Emergency skip unlocks in <span className="font-bold font-mono text-amber-300">{skipWaitSec}s</span>.
              </p>
            ) : (
              <span className="text-xs font-bold text-emerald-300">Commander offline. Turn skip authorized.</span>
            )}
          </div>
          {skipReady && (
            <HudButton
              data-testid="skip-disconnected"
              disabled={skipping}
              variant="secondary"
              onClick={() => void handleSkip()}
              className="text-xs"
            >
              {skipping ? "Skipping…" : "⚡ Skip Disconnected Shooter"}
            </HudButton>
          )}
        </HudPanel>
      )}

      {/* Dual Radar Grids */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Home Defense Grid */}
        <HudPanel corners className="space-y-4 p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
                SECTOR DEFENSE · YOUR ARMADA
              </p>
              <h2 className="text-lg font-bold uppercase tracking-wide text-white">
                Fleet Radar Status
              </h2>
            </div>
            <span className="rounded bg-black/60 px-2.5 py-1 text-[11px] font-mono text-cyan-300 border border-cyan-500/30">
              {5 - sunkIds.length}/5 OPERATIONAL
            </span>
          </div>

          <div className="relative overflow-hidden rounded-lg">
            <BattleGrid
              marks={homeMarks}
              ships={homeShips}
              sunkShipIds={sunkIds}
            />
          </div>
        </HudPanel>

        {/* Right: Target Acquisition Radar */}
        <HudPanel corners tone={isMyTurn ? "accent" : "default"} className="space-y-4 p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
                OFFENSIVE FIRE CONTROL · ENEMY SECTOR
              </p>
              <h2 className="text-lg font-bold uppercase tracking-wide text-white">
                Target Acquisition Grid
              </h2>
            </div>
            {selected ? (
              <span className="rounded bg-cyan-950/80 px-2.5 py-1 text-xs font-mono font-bold text-cyan-200 border border-cyan-400 shadow-[0_0_10px_rgba(0,242,254,0.3)] animate-pulse">
                LOCKED: {selected}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-white/50">
                {isMyTurn ? "SELECT TARGET CELL" : "WAITING FOR TURN"}
              </span>
            )}
          </div>

          <div className="relative overflow-hidden rounded-lg">
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
          </div>

          <div className="pt-2">
            <HudButton
              data-testid="fire-shot"
              fullWidth
              variant={selected && isMyTurn ? "danger" : "ghost"}
              disabled={!selected || !isMyTurn || firing || ended}
              onClick={() => void handleFire()}
              className="py-3.5 text-base font-black tracking-widest"
            >
              {firing ? "🚀 Launching Missile…" : selected ? `🚀 FIRE AT [${selected}]` : "Select Target Cell"}
            </HudButton>
          </div>
        </HudPanel>
      </div>

      {/* Battle Status Readouts */}
      {statusMessage && (
        <div className="rounded-[var(--radius-hud)] border border-emerald-500/40 bg-emerald-950/40 p-4 text-sm font-mono font-bold text-emerald-200 shadow-[0_0_15px_rgba(0,245,160,0.25)]" data-testid="battle-status">
          📡 TELEMETRY: {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-[var(--radius-hud)] border border-rose-500/40 bg-rose-950/40 p-4 text-sm font-mono text-rose-300">
          ⚠️ ERROR: {errorMessage}
        </div>
      )}
    </div>
  );
}
