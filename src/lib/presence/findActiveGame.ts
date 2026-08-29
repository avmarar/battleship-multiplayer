import {
  collection,
  type Firestore,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  GAMES_COLLECTION,
  type GameDocument,
  type GameStatus,
} from "@/lib/games/types";

const ACTIVE_STATUSES: GameStatus[] = ["PLACEMENT", "BATTLE"];

export type ActiveGame = GameDocument & { id: string };

export async function findActiveGame(
  db: Firestore,
  uid: string
): Promise<ActiveGame | null> {
  const snapshot = await getDocs(
    query(
      collection(db, GAMES_COLLECTION),
      where("memberIds", "array-contains", uid)
    )
  );

  const active = snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      ...(docSnapshot.data() as GameDocument),
    }))
    .filter((game) => ACTIVE_STATUSES.includes(game.status))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });

  return active[0] ?? null;
}

export function resumeHref(game: Pick<ActiveGame, "id" | "status">) {
  return game.status === "BATTLE" || game.status === "ENDED"
    ? `/game?gameId=${game.id}`
    : `/placement?gameId=${game.id}`;
}
