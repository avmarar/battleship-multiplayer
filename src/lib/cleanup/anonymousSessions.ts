import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
  type Firestore,
} from "firebase/firestore";
import { LEADERBOARD_COLLECTION } from "@/lib/leaderboard/types";
import { PRESENCE_COLLECTION } from "@/lib/presence/types";
import { profileDocSegments } from "@/lib/profile/paths";

export const GUEST_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SweepResult = {
  deletedProfiles: number;
  deletedPresence: number;
  deletedLeaderboard: number;
  skippedRegistered: number;
};

type ProfileAccountFields = {
  accountType?: "guest" | "registered";
};

export async function sweepStaleGuestSessions(
  db: Firestore,
  options: { maxAgeMs?: number; now?: Date } = {}
): Promise<SweepResult> {
  const maxAgeMs = options.maxAgeMs ?? GUEST_SESSION_MAX_AGE_MS;
  const now = options.now ?? new Date();
  const cutoff = Timestamp.fromDate(new Date(now.getTime() - maxAgeMs));
  const stalePresence = await getDocs(
    query(
      collection(db, PRESENCE_COLLECTION),
      where("lastSeenAt", "<", cutoff)
    )
  );

  const result: SweepResult = {
    deletedProfiles: 0,
    deletedPresence: 0,
    deletedLeaderboard: 0,
    skippedRegistered: 0,
  };

  for (const presenceSnap of stalePresence.docs) {
    const uid = presenceSnap.id;
    const profileRef = doc(db, ...profileDocSegments(uid));
    const profileSnap = await getDoc(profileRef);
    const accountType = (profileSnap.data() as ProfileAccountFields | undefined)
      ?.accountType;

    if (accountType === "registered") {
      result.skippedRegistered += 1;
      continue;
    }

    if (profileSnap.exists()) {
      await deleteDoc(profileRef);
      result.deletedProfiles += 1;
    }

    const leaderboardRef = doc(db, LEADERBOARD_COLLECTION, uid);
    const leaderboardSnap = await getDoc(leaderboardRef);
    if (leaderboardSnap.exists()) {
      await deleteDoc(leaderboardRef);
      result.deletedLeaderboard += 1;
    }

    await deleteDoc(presenceSnap.ref);
    result.deletedPresence += 1;
  }

  return result;
}
