"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { BattleGrid, type CellMark } from "@/components/grid/BattleGrid";
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
  { id: "winPct", label: "Win%" },
  { id: "wins", label: "Wins" },
  { id: "recent", label: "Recent" },
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
    return <p className="text-white/70">Connecting…</p>;
  }

  if (auth.status !== "connected") {
    return (
      <p className="text-white/70">
        Sign in to view the authenticated leaderboard.
      </p>
    );
  }

  return (
    <div className="space-y-8" data-testid="scoreboard-workspace">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
          Scoreboard
        </p>
        <h1 className="text-3xl font-semibold text-white">Fleet standings</h1>
        <p className="text-sm text-white/70">
          Wins and losses are recorded when a match ends. Sort by win rate,
          raw wins, or most recent battle.
        </p>
      </header>

      {summary && <MatchSummaryCard summary={summary} showLeaderboardLink={false} />}

      {summary && (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-[0.2em] text-cyan-100">
            Final target grid
          </h2>
          <BattleGrid marks={targetMarks} disabled />
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sort standings">
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={sort === option.id}
              data-testid={`sort-${option.id}`}
              onClick={() => setSort(option.id)}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-semibold",
                sort === option.id
                  ? "bg-[#00CED1] text-[#041218]"
                  : "border border-white/20 text-white hover:border-white/40",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>

        {ranked.length === 0 ? (
          <p className="text-sm text-white/60" data-testid="leaderboard-empty">
            No recorded matches yet. Finish a battle to appear here.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="min-w-full text-left text-sm text-white/80">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-cyan-100">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Commander</th>
                  <th className="px-4 py-3">W</th>
                  <th className="px-4 py-3">L</th>
                  <th className="px-4 py-3">Win%</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((entry, index) => (
                  <tr
                    key={entry.uid}
                    data-testid={`leaderboard-row-${entry.uid}`}
                    className={
                      entry.uid === uid
                        ? "bg-cyan-400/10 text-white"
                        : "border-t border-white/5"
                    }
                  >
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold">{entry.nickname}</td>
                    <td className="px-4 py-3">{entry.wins}</td>
                    <td className="px-4 py-3">{entry.losses}</td>
                    <td className="px-4 py-3">{formatWinPct(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
      <Link href="/" className="text-sm font-semibold text-cyan-100">
        ← Hub
      </Link>
    </div>
  );
}
