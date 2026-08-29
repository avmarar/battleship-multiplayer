import { doc, type Firestore, updateDoc } from "firebase/firestore";
import { toLockedPayload, type PlacedShip } from "@/lib/grid/placement";
import {
  GAMES_COLLECTION,
  GAME_TEAMS_COLLECTION,
  type GameTeamId,
} from "./types";

export async function saveDraftFleet(
  db: Firestore,
  gameId: string,
  teamId: GameTeamId,
  ships: PlacedShip[]
) {
  await updateDoc(
    doc(db, GAMES_COLLECTION, gameId, GAME_TEAMS_COLLECTION, teamId),
    {
      ships: toLockedPayload(ships),
    }
  );
}
