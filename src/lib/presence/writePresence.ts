import {
  doc,
  type Firestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { PRESENCE_COLLECTION } from "./types";

export async function writePresence(
  db: Firestore,
  uid: string,
  input: {
    isConnected: boolean;
    gameId?: string | null;
    matchId?: string | null;
  }
) {
  await setDoc(
    doc(db, PRESENCE_COLLECTION, uid),
    {
      uid,
      isConnected: input.isConnected,
      lastSeenAt: serverTimestamp(),
      gameId: input.gameId ?? null,
      matchId: input.matchId ?? null,
    },
    { merge: true }
  );
}
