import { describe, expect, it } from "vitest";
import {
  fallbackNickname,
  nextStats,
  sortLeaderboard,
  winPct,
} from "@/lib/leaderboard/stats";
import { buildMatchSummary } from "@/lib/leaderboard/summary";
import type { GameDocument, GameTeamDocument } from "@/lib/games/types";

describe("leaderboard stats (LB-2 / LB-3)", () => {
  it("computes win percentage from W/L", () => {
    expect(winPct({ wins: 3, losses: 1 })).toBe(0.75);
    expect(winPct({ wins: 0, losses: 0 })).toBe(0);
  });

  it("sorts by Win%, Wins, then recency", () => {
    const entries = [
      { uid: "a", nickname: "A", wins: 2, losses: 2 },
      { uid: "b", nickname: "B", wins: 3, losses: 0 },
      { uid: "c", nickname: "C", wins: 1, losses: 0 },
    ];
    expect(sortLeaderboard(entries, "winPct").map((row) => row.uid)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(sortLeaderboard(entries, "wins").map((row) => row.uid)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("applies a win or loss once per gameId", () => {
    const first = nextStats(undefined, "alpha", true, "game-1", "Alpha");
    expect(first).toMatchObject({ wins: 1, losses: 0, lastGameId: "game-1" });
    expect(nextStats(first!, "alpha", true, "game-1")).toBeNull();
    expect(nextStats(first!, "alpha", false, "game-2")).toMatchObject({
      wins: 1,
      losses: 1,
    });
  });

  it("falls back to a short commander name", () => {
    expect(fallbackNickname("abcd1234")).toBe("Commander ABCD");
  });
});

describe("match summary (LB-1)", () => {
  it("builds a post-match card from ended team docs", () => {
    const game = {
      status: "ENDED",
      winnerTeam: "ALPHA",
    } as GameDocument;
    const mine = {
      shotsFired: ["A1", "B2"],
      ships: [{ size: 2, hits: 1, coordinates: ["A1", "A2"], type: "DESTROYER" }],
    } as GameTeamDocument;
    const enemy = {
      shotsFired: [],
      ships: [
        { size: 2, hits: 2, coordinates: ["J9", "J10"], type: "DESTROYER" },
      ],
    } as GameTeamDocument;

    expect(buildMatchSummary(game, "ALPHA", mine, enemy)).toEqual({
      winnerTeam: "ALPHA",
      didWin: true,
      myTeam: "ALPHA",
      shotsFired: 2,
      shipsSunk: 1,
      shipsLost: 0,
    });
  });
});
