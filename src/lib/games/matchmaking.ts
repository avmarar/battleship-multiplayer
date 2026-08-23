import {
  collection,
  doc,
  type Firestore,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  GAMES_COLLECTION,
  GAME_TEAMS_COLLECTION,
  MATCHMAKING_SLOT_PATH,
  type GameDocument,
  type GameTeamId,
} from "./types";

export type QuickPlayResult =
  | { status: "waiting" }
  | { status: "matched"; gameId: string };

function guestNickname(uid: string) {
  return `Guest-${uid.slice(0, 4).toUpperCase()}`;
}

function teamPayload(
  teamId: GameTeamId,
  captainId: string
): Record<string, unknown> {
  return {
    teamId,
    memberIds: [captainId],
    ships: [],
    isLocked: false,
    shotsFired: [],
  };
}

function gamePayload(alphaUid: string, betaUid: string) {
  return {
    status: "PLACEMENT",
    memberIds: [alphaUid, betaUid],
    teams: {
      ALPHA: { captainId: alphaUid, memberIds: [alphaUid] },
      BETA: { captainId: betaUid, memberIds: [betaUid] },
    },
    placement: {
      ALPHA: { isLocked: false },
      BETA: { isLocked: false },
    },
    createdAt: Timestamp.now(),
  };
}

function isPermissionDenied(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "permission-denied"
  );
}

async function writeTeamDocs(
  db: Firestore,
  gameId: string,
  alphaUid: string,
  betaUid: string
) {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  await Promise.all([
    setDoc(doc(gameRef, GAME_TEAMS_COLLECTION, "ALPHA"), teamPayload("ALPHA", alphaUid)),
    setDoc(doc(gameRef, GAME_TEAMS_COLLECTION, "BETA"), teamPayload("BETA", betaUid)),
  ]);
}

async function joinQuickPlayDirect(
  db: Firestore,
  uid: string,
  nickname: string
): Promise<QuickPlayResult> {
  const slotRef = doc(db, MATCHMAKING_SLOT_PATH[0], MATCHMAKING_SLOT_PATH[1]);
  const slotSnapshot = await getDoc(slotRef);
  const waitingUid = slotSnapshot.exists()
    ? (slotSnapshot.data()?.uid as string | null)
    : null;

  if (waitingUid && waitingUid !== uid) {
    const gameRef = doc(collection(db, GAMES_COLLECTION));
    await setDoc(gameRef, gamePayload(waitingUid, uid));
    await setDoc(slotRef, {
      uid: null,
      nickname: null,
      updatedAt: Timestamp.now(),
    });
    await writeTeamDocs(db, gameRef.id, waitingUid, uid);
    return { status: "matched", gameId: gameRef.id };
  }

  await setDoc(slotRef, {
    uid,
    nickname,
    updatedAt: Timestamp.now(),
  });
  return { status: "waiting" };
}

export async function joinQuickPlay(
  db: Firestore,
  uid: string
): Promise<QuickPlayResult> {
  const nickname = guestNickname(uid);
  const slotRef = doc(db, MATCHMAKING_SLOT_PATH[0], MATCHMAKING_SLOT_PATH[1]);
  const gameRef = doc(collection(db, GAMES_COLLECTION));

  if (typeof window !== "undefined") {
    return joinQuickPlayDirect(db, uid, nickname);
  }

  try {
    const result = await runTransaction(db, async (transaction) => {
      const slotSnapshot = await transaction.get(slotRef);
      const waitingUid = slotSnapshot.exists()
        ? (slotSnapshot.data()?.uid as string | null)
        : null;

      if (waitingUid && waitingUid !== uid) {
        transaction.set(gameRef, gamePayload(waitingUid, uid));
        transaction.set(slotRef, {
          uid: null,
          nickname: null,
          updatedAt: Timestamp.now(),
        });
        return {
          status: "matched" as const,
          gameId: gameRef.id,
          alphaUid: waitingUid,
          betaUid: uid,
        };
      }

      transaction.set(slotRef, {
        uid,
        nickname,
        updatedAt: Timestamp.now(),
      });
      return { status: "waiting" as const };
    });

    if (result.status === "matched") {
      // Team docs cannot be created in the same transaction as the game:
      // rules call get() on the parent, which only sees committed data.
      await writeTeamDocs(db, result.gameId, result.alphaUid, result.betaUid);
      return { status: "matched", gameId: result.gameId };
    }

    return result;
  } catch (error) {
    // Browser transactions against the emulator often arrive without auth.
    if (isPermissionDenied(error)) {
      return joinQuickPlayDirect(db, uid, nickname);
    }
    throw error;
  }
}

export async function cancelQuickPlay(db: Firestore, uid: string) {
  const slotRef = doc(db, MATCHMAKING_SLOT_PATH[0], MATCHMAKING_SLOT_PATH[1]);
  await runTransaction(db, async (transaction) => {
    const slotSnapshot = await transaction.get(slotRef);
    if (!slotSnapshot.exists()) {
      return;
    }
    if (slotSnapshot.data()?.uid === uid) {
      transaction.set(slotRef, {
        uid: null,
        nickname: null,
        updatedAt: Timestamp.now(),
      });
    }
  });
}

export function subscribeToMatchedGame(
  db: Firestore,
  uid: string,
  onMatch: (gameId: string) => void
) {
  const gamesQuery = query(
    collection(db, GAMES_COLLECTION),
    where("memberIds", "array-contains", uid)
  );

  return onSnapshot(
    gamesQuery,
    (snapshot) => {
      const match = snapshot.docs.find(
        (docSnapshot) => docSnapshot.data()?.status === "PLACEMENT"
      );
      if (match) {
        onMatch(match.id);
      }
    },
    (error) => {
      console.error("Matchmaking listener failed", error);
    }
  );
}

export function teamForPlayer(
  game: GameDocument,
  uid: string
): GameTeamId | null {
  if (game.teams.ALPHA.memberIds.includes(uid)) {
    return "ALPHA";
  }
  if (game.teams.BETA.memberIds.includes(uid)) {
    return "BETA";
  }
  return null;
}

export function opponentTeam(team: GameTeamId): GameTeamId {
  return team === "ALPHA" ? "BETA" : "ALPHA";
}
