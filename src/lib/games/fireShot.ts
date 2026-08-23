import { doc, type Firestore, runTransaction } from "firebase/firestore";
import type { LockedShipPayload } from "@/lib/grid/placement";
import {
  assertLegalBattleShot,
  resolveShot,
} from "./combat";
import { opponentTeam, teamForPlayer } from "./matchmaking";
import {
  GAMES_COLLECTION,
  GAME_TEAMS_COLLECTION,
  type GameDocument,
  type GameTeamDocument,
} from "./types";

export type FireShotResult = {
  outcome: "MISS" | "HIT" | "SUNK";
  coordinate: string;
  ended: boolean;
  winnerTeam: GameDocument["winnerTeam"];
};

export async function fireShot(
  db: Firestore,
  gameId: string,
  uid: string,
  coordinate: string
): Promise<FireShotResult> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);

  return runTransaction(db, async (transaction) => {
    const gameSnapshot = await transaction.get(gameRef);
    if (!gameSnapshot.exists()) {
      throw new Error("Match no longer exists.");
    }

    const game = gameSnapshot.data() as GameDocument;
    const shooterTeam = teamForPlayer(game, uid);
    if (!shooterTeam) {
      throw new Error("You are not in this match.");
    }

    const targetTeam = opponentTeam(shooterTeam);
    const shooterRef = doc(
      db,
      GAMES_COLLECTION,
      gameId,
      GAME_TEAMS_COLLECTION,
      shooterTeam
    );
    const targetRef = doc(
      db,
      GAMES_COLLECTION,
      gameId,
      GAME_TEAMS_COLLECTION,
      targetTeam
    );

    const shooterSnapshot = await transaction.get(shooterRef);
    const targetSnapshot = await transaction.get(targetRef);
    if (!shooterSnapshot.exists() || !targetSnapshot.exists()) {
      throw new Error("Team data missing.");
    }

    const shooter = shooterSnapshot.data() as GameTeamDocument;
    const target = targetSnapshot.data() as GameTeamDocument;
    const cell = assertLegalBattleShot(
      game,
      uid,
      shooterTeam,
      coordinate,
      shooter.shotsFired
    );

    const resolution = resolveShot(
      target.ships as LockedShipPayload[],
      cell
    );
    const nextIndex =
      ((game.currentTurnIndex ?? 0) + 1) % (game.turnOrder?.length || 1);

    transaction.update(shooterRef, {
      shotsFired: [...shooter.shotsFired, cell],
    });
    transaction.update(targetRef, {
      ships: resolution.ships,
    });

    if (resolution.fleetSunk) {
      transaction.update(gameRef, {
        status: "ENDED",
        winnerTeam: shooterTeam,
        currentTurnIndex: game.currentTurnIndex ?? 0,
      });
      return {
        outcome: resolution.outcome,
        coordinate: cell,
        ended: true,
        winnerTeam: shooterTeam,
      };
    }

    transaction.update(gameRef, {
      currentTurnIndex: nextIndex,
    });

    return {
      outcome: resolution.outcome,
      coordinate: cell,
      ended: false,
      winnerTeam: undefined,
    };
  });
}
