import { doc, type Firestore, runTransaction } from "firebase/firestore";
import {
  DISCONNECT_SKIP_MS,
  PRESENCE_COLLECTION,
  type PresenceDocument,
} from "@/lib/presence/types";
import { canSkipDisconnected } from "@/lib/presence/stale";
import { GAMES_COLLECTION, type GameDocument } from "./types";

export async function skipDisconnectedTurn(
  db: Firestore,
  gameId: string,
  actorUid: string
) {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);

  return runTransaction(db, async (transaction) => {
    const gameSnapshot = await transaction.get(gameRef);
    if (!gameSnapshot.exists()) {
      throw new Error("Match no longer exists.");
    }

    const game = gameSnapshot.data() as GameDocument;
    if (!game.memberIds.includes(actorUid)) {
      throw new Error("You are not in this match.");
    }
    if (game.status !== "BATTLE" || !game.turnOrder?.length) {
      throw new Error("Battle is not in progress.");
    }

    const index = game.currentTurnIndex ?? 0;
    const shooter = game.turnOrder[index];
    if (!shooter) {
      throw new Error("No active shooter.");
    }
    if (shooter === actorUid) {
      throw new Error("You are still the active shooter.");
    }

    const presenceSnapshot = await transaction.get(
      doc(db, PRESENCE_COLLECTION, shooter)
    );
    const presence = presenceSnapshot.exists()
      ? (presenceSnapshot.data() as PresenceDocument)
      : null;

    if (!canSkipDisconnected(presence, Date.now(), DISCONNECT_SKIP_MS)) {
      throw new Error("The active shooter is still connected.");
    }

    const nextIndex = (index + 1) % game.turnOrder.length;
    transaction.update(gameRef, { currentTurnIndex: nextIndex });
    return { skipped: shooter, currentTurnIndex: nextIndex };
  });
}
