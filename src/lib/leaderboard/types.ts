import type { Timestamp } from "firebase/firestore";

export type LeaderboardEntry = {
  uid: string;
  nickname: string;
  wins: number;
  losses: number;
  lastPlayedAt?: Timestamp;
  lastGameId?: string;
};

export type LeaderboardSort = "winPct" | "wins" | "recent";

export const LEADERBOARD_COLLECTION = "leaderboard";
