import {
  doc,
  type Firestore,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { GAMES_COLLECTION, type GameDocument } from "@/lib/games/types";
import { nextStats } from "./stats";
import { LEADERBOARD_COLLECTION, type LeaderboardEntry } from "./types";

export type RecordMatchStatsResult =
  | { recorded: false; reason: "not-ended" | "already-recorded" }
  | { recorded: true };

export async function recordMatchStats(
  db: Firestore,
  gameId: string,
  actorUid: string
): Promise<RecordMatchStatsResult> {
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
    if (game.status !== "ENDED" || !game.winnerTeam) {
      return { recorded: false, reason: "not-ended" } as const;
    }
    if (game.statsRecorded) {
      return { recorded: false, reason: "already-recorded" } as const;
    }

    const refs = game.memberIds.map((uid) =>
      doc(db, LEADERBOARD_COLLECTION, uid)
    );
    const snapshots = await Promise.all(
      refs.map((ref) => transaction.get(ref))
    );

    transaction.update(gameRef, { statsRecorded: true });

    snapshots.forEach((snapshot, index) => {
      const uid = game.memberIds[index];
      const existing = snapshot.exists()
        ? (snapshot.data() as LeaderboardEntry)
        : undefined;
      const won = game.teams[game.winnerTeam!].memberIds.includes(uid);
      const next = nextStats(existing, uid, won, gameId);
      if (!next) {
        return;
      }
      transaction.set(refs[index], {
        ...next,
        lastPlayedAt: Timestamp.now(),
      });
    });

    return { recorded: true } as const;
  });
}
