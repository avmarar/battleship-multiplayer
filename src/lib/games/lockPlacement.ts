import { doc, type Firestore, runTransaction } from "firebase/firestore";
import {
  isFleetComplete,
  toLockedPayload,
  type PlacedShip,
} from "@/lib/grid/placement";
import {
  GAMES_COLLECTION,
  GAME_TEAMS_COLLECTION,
  type GameTeamId,
} from "./types";

export async function lockPlacement(
  db: Firestore,
  gameId: string,
  teamId: GameTeamId,
  ships: PlacedShip[]
) {
  if (!isFleetComplete(ships)) {
    throw new Error("Place all five ships before locking.");
  }

  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  const teamRef = doc(db, GAMES_COLLECTION, gameId, GAME_TEAMS_COLLECTION, teamId);
  const payload = toLockedPayload(ships);

  await runTransaction(db, async (transaction) => {
    const gameSnapshot = await transaction.get(gameRef);
    const teamSnapshot = await transaction.get(teamRef);

    if (!gameSnapshot.exists() || !teamSnapshot.exists()) {
      throw new Error("Match no longer exists.");
    }

    const game = gameSnapshot.data();
    if (game.placement?.[teamId]?.isLocked || teamSnapshot.data()?.isLocked) {
      throw new Error("Placement is already locked.");
    }

    transaction.update(teamRef, {
      ships: payload,
      isLocked: true,
    });
    transaction.update(gameRef, {
      [`placement.${teamId}.isLocked`]: true,
    });
  });
}
