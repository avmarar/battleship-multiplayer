import type { GameDocument, GameTeamId } from "./types";

export function isTeamCaptain(
  game: GameDocument | null | undefined,
  teamId: GameTeamId | null | undefined,
  uid: string | null | undefined
) {
  if (!game || !teamId || !uid) {
    return false;
  }
  return game.teams[teamId]?.captainId === uid;
}

export function assertTeamCaptain(
  game: GameDocument,
  teamId: GameTeamId,
  uid: string
) {
  if (!isTeamCaptain(game, teamId, uid)) {
    throw new Error("Only the team captain can lock placement.");
  }
}
