import {
  doc,
  type Firestore,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { fallbackNickname } from "./stats";
import { LEADERBOARD_COLLECTION, type LeaderboardEntry } from "./types";

export async function upsertLeaderboardNickname(
  db: Firestore,
  uid: string,
  nickname: string
) {
  const trimmed = nickname.trim();
  if (!trimmed) {
    return;
  }

  const ref = doc(db, LEADERBOARD_COLLECTION, uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) {
    const current = snapshot.data() as LeaderboardEntry;
    await setDoc(
      ref,
      {
        ...current,
        uid,
        nickname: trimmed,
      },
      { merge: true }
    );
    return;
  }

  await setDoc(ref, {
    uid,
    nickname: trimmed || fallbackNickname(uid),
    wins: 0,
    losses: 0,
    lastPlayedAt: Timestamp.now(),
  } satisfies LeaderboardEntry);
}
