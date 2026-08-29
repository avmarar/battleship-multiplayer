import type { LockedShipPayload } from "@/lib/grid/placement";
import { isGridCoordinate, type GridCoordinate } from "@/lib/grid/coordinates";
import type { GameDocument, GameTeamId } from "./types";
import { opponentTeam } from "./matchmaking";

export function buildTurnOrder(game: GameDocument): string[] {
  const alpha = game.teams.ALPHA.memberIds;
  const beta = game.teams.BETA.memberIds;
  const order: string[] = [];
  const max = Math.max(alpha.length, beta.length);
  for (let i = 0; i < max; i += 1) {
    if (alpha[i]) {
      order.push(alpha[i]);
    }
    if (beta[i]) {
      order.push(beta[i]);
    }
  }
  return order;
}

export function activeShooterId(game: GameDocument): string | null {
  if (game.status !== "BATTLE" || !game.turnOrder?.length) {
    return null;
  }
  const index = game.currentTurnIndex ?? 0;
  return game.turnOrder[index] ?? null;
}

export function resolveShot(
  ships: LockedShipPayload[],
  coordinate: GridCoordinate
): {
  outcome: "MISS" | "HIT" | "SUNK";
  ships: LockedShipPayload[];
  fleetSunk: boolean;
} {
  let outcome: "MISS" | "HIT" | "SUNK" = "MISS";
  const next = ships.map((ship) => {
    if (!ship.coordinates.includes(coordinate)) {
      return ship;
    }
    if (ship.hits >= ship.size) {
      return ship;
    }
    const hits = ship.hits + 1;
    outcome = hits >= ship.size ? "SUNK" : "HIT";
    return { ...ship, hits };
  });

  const fleetSunk = next.every((ship) => ship.hits >= ship.size);
  return { outcome, ships: next, fleetSunk };
}

export function assertLegalBattleShot(
  game: GameDocument,
  shooterUid: string,
  shooterTeam: GameTeamId,
  coordinate: string,
  priorShots: string[]
): GridCoordinate {
  if (game.status !== "BATTLE") {
    throw new Error("Battle has not started.");
  }
  if (activeShooterId(game) !== shooterUid) {
    throw new Error("It is not your turn.");
  }
  if (!isGridCoordinate(coordinate)) {
    throw new Error("Invalid target cell.");
  }
  if (priorShots.includes(coordinate)) {
    throw new Error("You already fired at that cell.");
  }
  void shooterTeam;
  void opponentTeam;
  return coordinate;
}
