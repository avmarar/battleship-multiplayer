import type { LeaderboardEntry, LeaderboardSort } from "./types";

export function gamesPlayed(entry: Pick<LeaderboardEntry, "wins" | "losses">) {
  return entry.wins + entry.losses;
}

export function winPct(entry: Pick<LeaderboardEntry, "wins" | "losses">) {
  const played = gamesPlayed(entry);
  return played === 0 ? 0 : entry.wins / played;
}

export function formatWinPct(entry: Pick<LeaderboardEntry, "wins" | "losses">) {
  return `${Math.round(winPct(entry) * 100)}%`;
}

export function fallbackNickname(uid: string) {
  return `Commander ${uid.slice(0, 4).toUpperCase()}`;
}

function lastPlayedMillis(entry: LeaderboardEntry) {
  const value = entry.lastPlayedAt;
  if (!value) {
    return 0;
  }
  return typeof value.toMillis === "function" ? value.toMillis() : 0;
}

export function sortLeaderboard(
  entries: LeaderboardEntry[],
  sort: LeaderboardSort
): LeaderboardEntry[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    if (sort === "wins") {
      return b.wins - a.wins || winPct(b) - winPct(a);
    }
    if (sort === "recent") {
      return lastPlayedMillis(b) - lastPlayedMillis(a);
    }
    return winPct(b) - winPct(a) || b.wins - a.wins;
  });
  return copy;
}

export function nextStats(
  existing: LeaderboardEntry | undefined,
  uid: string,
  won: boolean,
  gameId: string,
  nickname?: string
): LeaderboardEntry | null {
  if (existing?.lastGameId === gameId) {
    return null;
  }
  return {
    uid,
    nickname: nickname?.trim() || existing?.nickname || fallbackNickname(uid),
    wins: (existing?.wins ?? 0) + (won ? 1 : 0),
    losses: (existing?.losses ?? 0) + (won ? 0 : 1),
    lastGameId: gameId,
  };
}
