import { doc, type Firestore, runTransaction } from "firebase/firestore";
import {
  isFleetComplete,
  toLockedPayload,
  type PlacedShip,
} from "@/lib/grid/placement";
import { buildTurnOrder } from "./combat";
import { opponentTeam } from "./matchmaking";
import {
  GAMES_COLLECTION,
  GAME_TEAMS_COLLECTION,
  type GameDocument,
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

    const game = gameSnapshot.data() as GameDocument;
    if (game.status !== "PLACEMENT") {
      throw new Error("Placement is closed.");
    }
    if (game.placement?.[teamId]?.isLocked || teamSnapshot.data()?.isLocked) {
      throw new Error("Placement is already locked.");
    }

    const other = opponentTeam(teamId);
    const otherLocked = game.placement?.[other]?.isLocked === true;

    transaction.update(teamRef, {
      ships: payload,
      isLocked: true,
    });

    if (otherLocked) {
      const turnOrder = buildTurnOrder({
        ...game,
        placement: {
          ALPHA: {
            isLocked:
              teamId === "ALPHA" ? true : game.placement.ALPHA.isLocked,
          },
          BETA: {
            isLocked: teamId === "BETA" ? true : game.placement.BETA.isLocked,
          },
        },
      });
      transaction.update(gameRef, {
        [`placement.${teamId}.isLocked`]: true,
        status: "BATTLE",
        turnOrder,
        currentTurnIndex: 0,
      });
    } else {
      transaction.update(gameRef, {
        [`placement.${teamId}.isLocked`]: true,
      });
    }
  });
}
