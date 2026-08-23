import {
  collection,
  doc,
  type Firestore,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
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
    createdAt: serverTimestamp(),
  };
}

export async function joinQuickPlay(
  db: Firestore,
  uid: string
): Promise<QuickPlayResult> {
  const nickname = guestNickname(uid);
  const slotRef = doc(db, MATCHMAKING_SLOT_PATH[0], MATCHMAKING_SLOT_PATH[1]);
  const gameRef = doc(collection(db, GAMES_COLLECTION));

  return runTransaction(db, async (transaction) => {
    const slotSnapshot = await transaction.get(slotRef);
    const waitingUid = slotSnapshot.exists()
      ? (slotSnapshot.data()?.uid as string | null)
      : null;

    if (waitingUid && waitingUid !== uid) {
      transaction.set(gameRef, gamePayload(waitingUid, uid));
      transaction.set(
        doc(gameRef, GAME_TEAMS_COLLECTION, "ALPHA"),
        teamPayload("ALPHA", waitingUid)
      );
      transaction.set(
        doc(gameRef, GAME_TEAMS_COLLECTION, "BETA"),
        teamPayload("BETA", uid)
      );
      transaction.set(slotRef, {
        uid: null,
        nickname: null,
        updatedAt: serverTimestamp(),
      });
      return { status: "matched", gameId: gameRef.id } satisfies QuickPlayResult;
    }

    transaction.set(slotRef, {
      uid,
      nickname,
      updatedAt: serverTimestamp(),
    });
    return { status: "waiting" } satisfies QuickPlayResult;
  });
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
        updatedAt: serverTimestamp(),
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
