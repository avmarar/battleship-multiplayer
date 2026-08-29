import type { GameDocument, GameTeamDocument, GameTeamId } from "@/lib/games/types";

export type MatchSummary = {
  winnerTeam: GameTeamId;
  didWin: boolean;
  myTeam: GameTeamId;
  shotsFired: number;
  shipsSunk: number;
  shipsLost: number;
  ranked: boolean | null;
};

export function countSunk(ships: GameTeamDocument["ships"] | undefined) {
  return (ships ?? []).filter((ship) => ship.hits >= ship.size).length;
}

export function buildMatchSummary(
  game: GameDocument,
  myTeamId: GameTeamId,
  myTeam: GameTeamDocument | null,
  enemyTeam: GameTeamDocument | null
): MatchSummary | null {
  if (game.status !== "ENDED" || !game.winnerTeam) {
    return null;
  }
  return {
    winnerTeam: game.winnerTeam,
    didWin: game.winnerTeam === myTeamId,
    myTeam: myTeamId,
    shotsFired: myTeam?.shotsFired.length ?? 0,
    shipsSunk: countSunk(enemyTeam?.ships),
    shipsLost: countSunk(myTeam?.ships),
    ranked: game.statsRecorded ? game.statsRanked === true : null,
  };
}
