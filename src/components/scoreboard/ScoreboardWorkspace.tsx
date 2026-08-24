"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { BattleGrid, type CellMark } from "@/components/grid/BattleGrid";
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";
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
import { formatWinPct, sortLeaderboard } from "@/lib/leaderboard/stats";
import { buildMatchSummary } from "@/lib/leaderboard/summary";
import {
  LEADERBOARD_COLLECTION,
  type LeaderboardEntry,
  type LeaderboardSort,
} from "@/lib/leaderboard/types";
import { MatchSummaryCard } from "./MatchSummaryCard";

const SORTS: { id: LeaderboardSort; label: string }[] = [
  { id: "winPct", label: "Win Rate %" },
  { id: "wins", label: "Total Wins" },
  { id: "recent", label: "Most Recent" },
];

type ScoreboardWorkspaceProps = {
  gameId?: string;
};

export function ScoreboardWorkspace({ gameId }: ScoreboardWorkspaceProps) {
  const auth = useAnonymousAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sort, setSort] = useState<LeaderboardSort>("winPct");
  const [game, setGame] = useState<GameDocument | null>(null);
  const [myTeamDoc, setMyTeamDoc] = useState<GameTeamDocument | null>(null);
  const [enemyTeamDoc, setEnemyTeamDoc] = useState<GameTeamDocument | null>(
    null
  );
  const [myTeam, setMyTeam] = useState<GameTeamId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uid = auth.uid;
  const db = auth.db;

  useEffect(() => {
    if (!db || !uid) {
      return;
    }
    return onSnapshot(
      collection(db, LEADERBOARD_COLLECTION),
      (snapshot) => {
        setEntries(snapshot.docs.map((docSnap) => docSnap.data() as LeaderboardEntry));
      },
      (error) => setErrorMessage(error.message)
    );
  }, [db, uid]);

  useEffect(() => {
    if (!db || !uid || !gameId) {
      return;
    }
    return onSnapshot(
      doc(db, GAMES_COLLECTION, gameId),
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }
        const data = snapshot.data() as GameDocument;
        setGame(data);
        setMyTeam(teamForPlayer(data, uid));
      },
      (error) => setErrorMessage(error.message)
    );
  }, [db, uid, gameId]);

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

  const ranked = useMemo(() => sortLeaderboard(entries, sort), [entries, sort]);
  const summary =
    game && myTeam ? buildMatchSummary(game, myTeam, myTeamDoc, enemyTeamDoc) : null;

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
    return marks;
  }, [enemyTeamDoc, myTeamDoc]);

  if (auth.status === "checking") {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center gap-3 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-6 py-3 text-cyan-200 shadow-[0_0_20px_rgba(0,242,254,0.3)]">
          <span className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono text-sm uppercase tracking-widest">LOADING FLEET STANDINGS…</span>
        </div>
      </div>
    );
  }

  if (auth.status !== "connected") {
    return (
      <HudPanel corners className="p-8 text-center space-y-3">
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">Authentication Required</h2>
        <p className="text-sm text-white/70">
          Sign in or register an account to view the authenticated global leaderboard.
        </p>
      </HudPanel>
    );
  }

  return (
    <div className="space-y-8" data-testid="scoreboard-workspace">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
          <p className="text-xs uppercase tracking-[0.3em] font-mono text-amber-200">
            GLOBAL FLEET COMMENDATIONS & RECORDS
          </p>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-[0.04em] text-white sm:text-4xl">
          Fleet Standings
        </h1>
        <p className="max-w-2xl text-sm text-white/70 leading-relaxed">
          Ranked statistics from battles where all commanding officers registered persistent credentials. Sort standings by win rate percentage, absolute victories, or recent engagements.
        </p>
      </header>

      {summary && <MatchSummaryCard summary={summary} showLeaderboardLink={false} />}

      {summary && (
        <HudPanel corners className="space-y-4 p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-mono text-cyan-200">
                ENGAGEMENT DEBRIEF
              </p>
              <h2 className="text-lg font-bold uppercase tracking-wide text-white">
                Final Target Grid Reconnaissance
              </h2>
            </div>
            <span className="rounded bg-black/60 px-2.5 py-1 text-[11px] font-mono text-cyan-300 border border-cyan-500/30">
              TACTICAL ARCHIVE
            </span>
          </div>
          <div className="relative overflow-hidden rounded-lg">
            <BattleGrid marks={targetMarks} disabled />
          </div>
        </HudPanel>
      )}

      {/* Leaderboard Table Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sort standings">
            {SORTS.map((option) => (
              <HudButton
                key={option.id}
                role="tab"
                aria-selected={sort === option.id}
                data-testid={`sort-${option.id}`}
                onClick={() => setSort(option.id)}
                variant={sort === option.id ? "primary" : "ghost"}
                className="px-4 text-xs font-mono"
              >
                {option.label}
              </HudButton>
            ))}
          </div>
          <span className="font-mono text-xs text-white/50">
            TOTAL RANKED COMMANDERS: {ranked.length}
          </span>
        </div>

        {ranked.length === 0 ? (
          <HudPanel className="p-8 text-center text-sm text-white/60 font-mono" data-testid="leaderboard-empty">
            No ranked standings recorded yet. Play a match with registered accounts to record stats!
          </HudPanel>
        ) : (
          <HudPanel corners className="overflow-x-auto p-0">
            <table className="min-w-full text-left text-sm text-white/80">
              <thead className="bg-[#081222] border-b border-white/10 text-xs uppercase font-mono tracking-[0.2em] text-cyan-300">
                <tr>
                  <th className="px-5 py-3.5">RANK</th>
                  <th className="px-5 py-3.5">COMMANDER</th>
                  <th className="px-5 py-3.5 text-center">WINS</th>
                  <th className="px-5 py-3.5 text-center">LOSSES</th>
                  <th className="px-5 py-3.5 text-right">WIN RATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {ranked.map((entry, index) => {
                  const isMe = entry.uid === uid;
                  const rank = index + 1;
                  return (
                    <tr
                      key={entry.uid}
                      data-testid={`leaderboard-row-${entry.uid}`}
                      className={[
                        "transition-colors",
                        isMe
                          ? "bg-cyan-950/40 text-cyan-100 font-bold shadow-[inset_0_0_20px_rgba(0,242,254,0.15)]"
                          : "hover:bg-white/5",
                      ].join(" ")}
                    >
                      <td className="px-5 py-4">
                        {rank === 1 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 font-black text-black text-xs shadow-[0_0_10px_#f59e0b]">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 font-black text-black text-xs shadow-[0_0_8px_#cbd5e1]">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 font-black text-white text-xs shadow-[0_0_8px_#b45309]">
                            3
                          </span>
                        ) : (
                          <span className="text-white/50">{rank}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-sans font-bold text-white flex items-center gap-2">
                        <span>{entry.nickname}</span>
                        {isMe && (
                          <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-400/40">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-emerald-300">
                        {entry.wins}
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-rose-300">
                        {entry.losses}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-cyan-200">
                        {formatWinPct(entry)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </HudPanel>
        )}
      </section>

      {errorMessage && <p className="text-sm font-mono text-rose-300">{errorMessage}</p>}
    </div>
  );
}
